import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { isObjectStorageConfigured, uploadToS3 } from "@/lib/storage/object-storage";

const LOCAL_FIRMWARE_DIR = join(process.cwd(), "public", "firmware");

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
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
  const storageKey = `${phoneModel.vendor.toLowerCase()}/${phoneModel.modelCode}/${safeVersion}/${originalName}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  let finalStorageKey = storageKey;

  if (isObjectStorageConfigured()) {
    const s3Result = await uploadToS3(storageKey, buffer, "application/octet-stream");
    if (!s3Result.ok) {
      return NextResponse.json({ ok: false, error: s3Result.error }, { status: 500 });
    }
    finalStorageKey = storageKey;
  } else {
    // Local storage in public/firmware (fallback — éphémère sur Railway)
    try {
      const dir = join(LOCAL_FIRMWARE_DIR, phoneModel.vendor.toLowerCase(), phoneModel.modelCode, safeVersion);
      mkdirSync(dir, { recursive: true });
      const dest = join(dir, originalName);
      const readable = Readable.from(buffer);
      const writable = createWriteStream(dest);
      await pipeline(readable, writable);
      finalStorageKey = storageKey;
    } catch (e: unknown) {
      const err = e as { message?: string };
      return NextResponse.json({ ok: false, error: `Erreur écriture locale: ${err.message}` }, { status: 500 });
    }
  }

  if (setDefault) {
    await db.firmware.updateMany({ where: { phoneModelId, isDefault: true }, data: { isDefault: false } });
  }

  const firmware = await db.firmware.create({
    data: {
      phoneModelId,
      version: safeVersion,
      storageKey: finalStorageKey,
      originalName,
      checksumSha256: sha256,
      releaseNotes: releaseNotes || null,
      status: "ACTIVE",
      isDefault: setDefault,
    },
  });

  return NextResponse.json({ ok: true, firmware });
}
