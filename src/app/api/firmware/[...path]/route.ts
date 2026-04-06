import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { buildPublicObjectUrl, isObjectStorageConfigured } from "@/lib/storage/object-storage";

// Mapping des chaînes de l'URL vers l'enum Vendor (identique au schéma Prisma)
const VENDOR_MAP: Record<string, "YEALINK" | "GRANDSTREAM" | "SNOM"> = {
  yealink: "YEALINK",
  grandstream: "GRANDSTREAM",
  snom: "SNOM",
};

export async function GET(
  request: Request,
  context: RouteContext<"/api/firmware/[...path]">
) {
  const params = await context.params;
  const pathSegments = params.path;
  const key = pathSegments.join("/");

  // Si le chemin a exactement deux segments, interpréter comme vendor/modelCode et lister les firmwares
  if (pathSegments.length === 2) {
    const [vendorStr, modelCode] = pathSegments;
    const vendor = VENDOR_MAP[vendorStr.toLowerCase()];
    
    if (!vendor) {
      return NextResponse.json(
        { ok: false, error: `Vendor '${vendorStr}' non reconnu. Valeurs possibles: yealink, grandstream, snom.` },
        { status: 400 }
      );
    }

    // Chercher le modèle correspondant
    const phoneModel = await db.phoneModel.findFirst({
      where: {
        vendor,
        modelCode: modelCode.toUpperCase(),
      },
      select: { id: true, displayName: true },
    });

    if (!phoneModel) {
      // Modèle non trouvé => retourner une liste vide (pas d'erreur 404)
      return NextResponse.json({
        ok: true,
        vendor,
        modelCode: modelCode.toUpperCase(),
        firmwares: [],
      });
    }

    // Récupérer les firmwares associés à ce modèle
    const firmwares = await db.firmware.findMany({
      where: {
        phoneModelId: phoneModel.id,
        // Optionnel: filtrer par status ACTIVE si on ne veut pas montrer les DRAFT/ARCHIVED
        // status: "ACTIVE",
      },
      select: {
        id: true,
        version: true,
        storageKey: true,
        originalName: true,
        fileSizeBytes: true,
        checksumSha256: true,
        releaseNotes: true,
        status: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: { version: "desc" },
    });

    // Construire la réponse avec les URLs de téléchargement
    const baseUrl = new URL(request.url).origin;
    const firmwareList = firmwares.map(fw => ({
      ...fw,
      fileSizeBytes: fw.fileSizeBytes?.toString(), // BigInt -> string pour JSON
      downloadUrl: `${baseUrl}/api/firmware/${fw.storageKey}`,
    }));

    return NextResponse.json({
      ok: true,
      vendor,
      modelCode: modelCode.toUpperCase(),
      modelDisplayName: phoneModel.displayName,
      firmwares: firmwareList,
    });
  }

  // Sinon, comportement original : servir un fichier spécifique par storageKey
  const fw = await db.firmware.findFirst({
    where: { storageKey: key },
    select: { fileData: true, originalName: true },
  });

  if (fw?.fileData) {
    const body = Buffer.isBuffer(fw.fileData) ? fw.fileData : Buffer.from(fw.fileData);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${encodeURIComponent(fw.originalName)}"`,
        "cache-control": "private, max-age=3600",
      },
    });
  }

  if (isObjectStorageConfigured()) {
    const publicUrl = buildPublicObjectUrl(key);
    if (publicUrl) return NextResponse.redirect(publicUrl, 307);
  }

  return NextResponse.json(
    { ok: false, error: "Firmware introuvable (pas en base ni sur le stockage objet)." },
    { status: 404 }
  );
}
