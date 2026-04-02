import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/update">
) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json();

  const phone = await db.phone.findUnique({ where: { id } });
  if (!phone) return NextResponse.json({ ok: false, error: "Téléphone introuvable" }, { status: 404 });

  await db.phone.update({
    where: { id },
    data: {
      label: body.label ?? phone.label,
      extensionNumber: body.extensionNumber ?? phone.extensionNumber,
      sipUsername: body.sipUsername ?? phone.sipUsername,
      sipPassword: body.sipPassword ?? phone.sipPassword,
      sipServer: body.sipServer ?? phone.sipServer,
      webPassword: body.webPassword ?? phone.webPassword,
      adminPassword: body.adminPassword ?? phone.adminPassword,
      status: body.status ?? phone.status,
      provisioningEnabled: body.provisioningEnabled ?? phone.provisioningEnabled,
      firmwareTargetId: body.firmwareTargetId !== undefined ? (body.firmwareTargetId || null) : phone.firmwareTargetId,
      siteId: body.siteId !== undefined ? (body.siteId || null) : phone.siteId,
    },
  });

  await db.auditLog.create({
    data: {
      action: "phone.update",
      entityType: "Phone",
      entityId: id,
      metadata: JSON.stringify(body),
    },
  });

  return NextResponse.json({ ok: true });
}
