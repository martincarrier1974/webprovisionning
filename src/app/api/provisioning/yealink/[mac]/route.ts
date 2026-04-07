import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getProvisioningContextByMac, getResolvedProvisioningRules } from "@/lib/provisioning/rules";
import {
  isValidMac,
  normalizeMac,
  prismaVendorToSupportedVendor,
  renderProvisioningConfig,
} from "@/lib/provisioning/vendors";
import { sendWebhook } from "@/lib/webhooks/notify";

export async function GET(
  request: Request,
  context: RouteContext<"/api/provisioning/yealink/[mac]">
) {
  const { mac: rawMac } = await context.params;

  // Yealink typically requests y000000000000.cfg (common), then <MAC>.cfg (or other variants)
  // Example requests: y000000000000.cfg, 805EC0EA1251.cfg, 805EC0EA1251, 80:5E:C0:EA:12:51.cfg
  const lowered = rawMac.toLowerCase();
  const isCommonConfig = lowered === "y000000000000.cfg" || lowered === "y000000000000";
  // Yealink demande aussi un fichier modèle ex: y000000000058.cfg (T33G=58, T46U=66, etc.)
  // On retourne un fichier vide pour que le téléphone continue sans erreur 404
  const isModelConfig = /^y\d{12}\.cfg$/.test(lowered) && !isCommonConfig;

  if (isCommonConfig || isModelConfig) {
    return new NextResponse("#!version:1.0.0.1\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", "x-provisioning-vendor": "yealink" },
    });
  }

  const mac = rawMac
    .replace(/\.(cfg|txt)$/i, "")
    .replace(/[^a-fA-F0-9]/g, "");

  if (!isValidMac(mac)) {
    return NextResponse.json({ ok: false, error: "Invalid MAC address" }, { status: 400 });
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
      vendor: "YEALINK",
      macAddress: normalizedMac,
      requestPath: request.url,
      success: true,
      statusCode: 200,
      message: `Resolved ${resolved.resolvedEntries.length} rules`,
    },
  });

  void sendWebhook("phone.provisioned", { mac: normalizedMac, vendor: "YEALINK", phoneId: phone.id });

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
