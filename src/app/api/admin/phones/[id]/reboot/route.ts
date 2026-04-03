import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { rebootPhone } from "@/lib/phone-control/reboot";
import { sendWebhook } from "@/lib/webhooks/notify";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/reboot">
) {
  await requireAdmin();
  const { id } = await context.params;

  const phone = await db.phone.findUnique({
    where: { id },
    select: {
      id: true, macAddress: true, ipAddress: true, adminPassword: true,
      phoneModel: { select: { vendor: true } },
    },
  });

  if (!phone) return NextResponse.json({ ok: false, error: "Téléphone introuvable." }, { status: 404 });
  if (!phone.ipAddress) return NextResponse.json({ ok: false, error: "Adresse IP requise. Configurez-la dans l'onglet Diagnostic." });

  const result = await rebootPhone(
    phone.phoneModel.vendor,
    phone.ipAddress,
    phone.adminPassword || "admin",
  );

  await db.auditLog.create({
    data: {
      action: result.ok ? "phone.reboot.success" : "phone.reboot.failed",
      entityType: "Phone",
      entityId: id,
      metadata: JSON.stringify({ vendor: phone.phoneModel.vendor, ip: phone.ipAddress, ...result }),
    },
  });

  if (result.ok) {
    void sendWebhook("phone.rebooted", { mac: phone.macAddress, ip: phone.ipAddress, vendor: phone.phoneModel.vendor });
  }

  return NextResponse.json({ ok: result.ok, message: result.message, method: result.method });
}
