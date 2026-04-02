import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/firmware-push">
) {
  await requireAdmin();
  const { id } = await context.params;

  const phone = await db.phone.findUnique({
    where: { id },
    include: {
      firmwareTarget: true,
      phoneModel: { select: { vendor: true } },
    },
  });

  if (!phone) {
    return NextResponse.json({ ok: false, error: "Téléphone introuvable." }, { status: 404 });
  }

  if (!phone.firmwareTarget) {
    return NextResponse.json({ ok: false, error: "Aucun firmware cible configuré." }, { status: 400 });
  }

  // Log the firmware push request
  await db.provisionLog.create({
    data: {
      phoneId: id,
      vendor: phone.phoneModel.vendor,
      macAddress: phone.macAddress,
      requestPath: `/api/admin/phones/${id}/firmware-push`,
      success: true,
      statusCode: 200,
      message: `Firmware push demandé — v${phone.firmwareTarget.version}`,
    },
  });

  return NextResponse.json({
    ok: true,
    version: phone.firmwareTarget.version,
    message: `Firmware v${phone.firmwareTarget.version} sera appliqué au prochain provisioning.`,
  });
}
