import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { buildPublicObjectUrl, isObjectStorageConfigured } from "@/lib/storage/object-storage";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/firmware/[...path]">
) {
  const params = await context.params;
  const key = params.path.join("/");

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
