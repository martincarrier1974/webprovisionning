import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { isValidMac, normalizeMac, prismaVendorToSupportedVendor, renderProvisioningConfig } from "@/lib/provisioning/vendors";
import { getProvisioningContextByMac, getResolvedProvisioningRules } from "@/lib/provisioning/rules";

export async function GET(
  request: Request,
  context: RouteContext<"/api/provisioning/yealink/[mac]">
) {
  const { mac } = await context.params;

  if (!isValidMac(mac)) {
    return NextResponse.json(
      { ok: false, error: "Invalid MAC address" },
      { status: 400 }
    );
  }

  const normalizedMac = normalizeMac(mac);
  const phone = await getProvisioningContextByMac(normalizedMac);

  if (!phone) {
    await db.provisionLog.create({
      data: {
        vendor: "YEALINK",
        macAddress: normalizedMac,
        requestPath: request.url,
        success: false,
        statusCode: 404,
        message: "Phone not found",
      },
    });

    return NextResponse.json({ ok: false, error: "Phone not found" }, { status: 404 });
  }

  const resolved = await getResolvedProvisioningRules(phone);
  const content = renderProvisioningConfig(
    prismaVendorToSupportedVendor(phone.phoneModel.vendor),
    normalizedMac,
    resolved.resolvedEntries
  );

  await db.phone.update({
    where: { id: phone.id },
    data: { lastProvisionedAt: new Date() },
  });

  await db.provisionLog.create({
    data: {
      phoneId: phone.id,
      vendor: "YEALINK",
      macAddress: normalizedMac,
      requestPath: request.url,
      success: true,
      statusCode: 200,
      message: `Resolved ${resolved.resolvedEntries.length} rules`,
    },
  });

  return new NextResponse(content, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-provisioning-vendor": "yealink",
      "x-device-mac": normalizedMac,
      "x-provisioning-rules": String(resolved.resolvedEntries.length),
    },
  });
}
