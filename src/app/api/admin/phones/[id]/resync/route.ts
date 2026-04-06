import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getProvisioningContextByMac, getResolvedProvisioningRules } from "@/lib/provisioning/rules";
import { sendSipNotify } from "@/lib/phone-control/sip-notify";
import {
  isValidMac,
  prismaVendorToSupportedVendor,
  renderGrandstreamXml,
  renderProvisioningConfig,
} from "@/lib/provisioning/vendors";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/resync">
) {
  await requireAdmin();
  const { id } = await context.params;

  const phoneRecord = await db.phone.findUnique({
    where: { id },
    select: { macAddress: true, ipAddress: true, adminPassword: true, sipUsername: true, sipPassword: true, sipServer: true },
  });
  if (!phoneRecord || !isValidMac(phoneRecord.macAddress)) {
    return NextResponse.json({ ok: false, error: "Téléphone introuvable." }, { status: 404 });
  }

  const phone = await getProvisioningContextByMac(phoneRecord.macAddress);
  if (!phone) return NextResponse.json({ ok: false, error: "Contexte introuvable." }, { status: 404 });

  const resolved = await getResolvedProvisioningRules(phone);
  const vendor = prismaVendorToSupportedVendor(phone.phoneModel.vendor);
  const config =
    vendor === "grandstream"
      ? renderGrandstreamXml(phone, resolved.resolvedEntries)
      : renderProvisioningConfig(vendor, phone, resolved.resolvedEntries);

  // SIP NOTIFY check-sync — NAT-friendly, même méthode que GDMS
  const remoteResult = await sendSipNotify({
    vendor: phone.phoneModel.vendor,
    phoneIp: phoneRecord.ipAddress,
    sipServer: phoneRecord.sipServer,
    sipUsername: phoneRecord.sipUsername,
    sipPassword: phoneRecord.sipPassword,
    event: "check-sync",
  });

  await db.phone.update({ where: { id }, data: { lastProvisionedAt: new Date() } });

  await db.provisionLog.create({
    data: {
      phoneId: id,
      vendor: phone.phoneModel.vendor,
      macAddress: phone.macAddress,
      requestPath: `/api/admin/phones/${id}/resync`,
      success: true,
      statusCode: 200,
      message: `Resync manuel — ${resolved.resolvedEntries.length} règles — ${remoteResult.message}`,
    },
  });

  return NextResponse.json({
    ok: true,
    linesGenerated: config.split("\n").length,
    remoteTriggered: remoteResult.ok,
    remoteMessage: remoteResult.message,
    remoteMethod: remoteResult.method,
  });
}
