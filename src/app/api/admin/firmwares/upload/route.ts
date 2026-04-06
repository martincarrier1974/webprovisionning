import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { isObjectStorageConfigured, uploadToS3 } from "@/lib/storage/object-storage";

/** Fichiers volumineux (hébergeurs type Railway / Vercel : ajuster la limite si besoin). */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  await requireAdmin();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const phoneModelId = formData.get("phoneModelId") as string;
  const version = formData.get("version") as string;
  const releaseNotes = formData.get("releaseNotes") as string | null;
  const setDefault = formData.get("isDefault") === "true";

  if (!file) return NextResponse.json({ ok: false, error: "Fichier requis." }, { status: 400 });
  if (!phoneModelId) return NextResponse.json({ ok: false, error: "Modèle requis." }, { status: 400 });
  if (!version) return NextResponse.json({ ok: false, error: "Version requise." }, { status: 400 });

  const phoneModel = await db.phoneModel.findUnique({ where: { id: phoneModelId }, select: { vendor: true, modelCode: true } });
  if (!phoneModel) return NextResponse.json({ ok: false, error: "Modèle introuvable." }, { status: 404 });

  const safeVersion = version.replace(/[^a-zA-Z0-9._\-]/g, "");
  const originalName = file.name;
  const storageKey = `${phoneModel.vendor.toLowerCase()}/${phoneModel.modelCode}/${safeVersion}/${originalName}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const size = BigInt(buffer.length);

  if (setDefault) {
    await db.firmware.updateMany({ where: { phoneModelId, isDefault: true }, data: { isDefault: false } });
  }

  if (isObjectStorageConfigured()) {
    const s3Result = await uploadToS3(storageKey, buffer, "application/octet-stream");
    if (!s3Result.ok) {
      return NextResponse.json({ ok: false, error: s3Result.error }, { status: 500 });
    }
    const firmware = await db.firmware.create({
      data: {
        phoneModelId,
        version: safeVersion,
        storageKey,
        fileData: null,
        originalName,
        fileSizeBytes: size,
        checksumSha256: sha256,
        releaseNotes: releaseNotes || null,
        status: "ACTIVE",
        isDefault: setDefault,
      },
      select: firmwareJsonSelect,
    });
    return NextResponse.json({ ok: true, firmware });
  }

  // Sans S3 (ex. Railway) : stocker le binaire en PostgreSQL (BYTEA)
  const firmware = await db.firmware.create({
    data: {
      phoneModelId,
      version: safeVersion,
      storageKey,
      fileData: buffer,
      originalName,
      fileSizeBytes: size,
      checksumSha256: sha256,
      releaseNotes: releaseNotes || null,
      status: "ACTIVE",
      isDefault: setDefault,
    },
    select: firmwareJsonSelect,
  });

  return NextResponse.json({ ok: true, firmware });
}

const firmwareJsonSelect = {
  id: true,
  phoneModelId: true,
  version: true,
  storageKey: true,
  originalName: true,
  fileSizeBytes: true,
  checksumSha256: true,
  releaseNotes: true,
  status: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;
