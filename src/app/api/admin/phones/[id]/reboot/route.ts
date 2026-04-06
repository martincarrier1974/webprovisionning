import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { rebootPhone } from "@/lib/phone-control/reboot";
import { sendSipNotify } from "@/lib/phone-control/sip-notify";
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
      sipUsername: true, sipPassword: true, sipServer: true,
      phoneModel: { select: { vendor: true } },
    },
  });

  if (!phone) return NextResponse.json({ ok: false, error: "Téléphone introuvable." }, { status: 404 });

  // Stratégie 1 : SIP NOTIFY reboot (NAT-friendly — même méthode que GDMS)
  const sipResult = await sendSipNotify({
    vendor: phone.phoneModel.vendor,
    phoneIp: phone.ipAddress,
    sipServer: phone.sipServer,
    sipUsername: phone.sipUsername,
    sipPassword: phone.sipPassword,
    event: "reboot",
  });

  // Stratégie 2 : HTTP direct (si téléphone accessible sur le même réseau)
  let result = sipResult;
  if (!sipResult.ok && phone.ipAddress) {
    const httpResult = await rebootPhone(
      phone.phoneModel.vendor,
      phone.ipAddress,
      phone.adminPassword || "admin",
    );
    if (httpResult.ok) result = { ok: true, method: httpResult.method, message: httpResult.message };
  }

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
