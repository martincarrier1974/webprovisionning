import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getProvisioningContextByMac, getResolvedProvisioningRules } from "@/lib/provisioning/rules";
import {
  isValidMac,
  normalizeMac,
  prismaVendorToSupportedVendor,
  renderProvisioningConfig,
  renderGrandstreamXml,
} from "@/lib/provisioning/vendors";
import { sendWebhook } from "@/lib/webhooks/notify";

export async function GET(
  request: Request,
  context: RouteContext<"/api/provisioning/grandstream/[mac]">
) {
  const { mac: rawMac } = await context.params;

  // Grandstream requests: cfg<MAC>.xml, cfg<MAC>, <MAC>.xml or bare <MAC>
  const isXmlRequest = /\.(xml|cfg)$/i.test(rawMac);
  const mac = rawMac
    .replace(/^cfg/i, "")
    .replace(/\.(xml|cfg|txt)$/i, "")
    .replace(/[^a-fA-F0-9]/g, "");

  if (!isValidMac(mac)) {
    return NextResponse.json({ ok: false, error: "Invalid MAC address" }, { status: 400 });
  }

  const normalizedMac = normalizeMac(mac);
  const phone = await getProvisioningContextByMac(normalizedMac);

  if (!phone) {
    await db.provisionLog.create({
      data: {
        vendor: "GRANDSTREAM",
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

  // GXP phones request cfg<MAC>.xml — return XML format; bare MAC = text/plain (preview)
  const useXml = isXmlRequest;
  const content = useXml
    ? renderGrandstreamXml(phone, resolved.resolvedEntries)
    : renderProvisioningConfig(
        prismaVendorToSupportedVendor(phone.phoneModel.vendor),
        phone,
        resolved.resolvedEntries
      );

  await db.phone.update({
    where: { id: phone.id },
    data: { lastProvisionedAt: new Date() },
  });

  await db.provisionLog.create({
    data: {
      phoneId: phone.id,
      vendor: "GRANDSTREAM",
      macAddress: normalizedMac,
      requestPath: request.url,
      success: true,
      statusCode: 200,
      message: `Resolved ${resolved.resolvedEntries.length} rules`,
    },
  });

  void sendWebhook("phone.provisioned", {
    mac: normalizedMac, vendor: "GRANDSTREAM",
    phoneId: phone.id, label: phone.label,
    rules: resolved.resolvedEntries.length,
  });

  return new NextResponse(content, {
    status: 200,
    headers: {
      "content-type": useXml ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8",
      "x-provisioning-vendor": "grandstream",
      "x-device-mac": normalizedMac,
      "x-provisioning-rules": String(resolved.resolvedEntries.length),
    },
  });
}
