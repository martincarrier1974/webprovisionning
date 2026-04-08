import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getProvisioningContextByMac, getResolvedProvisioningRules } from "@/lib/provisioning/rules";
import { isValidMac, normalizeMac, renderGrandstreamText } from "@/lib/provisioning/vendors";
import { sendWebhook } from "@/lib/webhooks/notify";

function emptyGrandstreamProvisionXml(comment: string) {
  const content = `<?xml version="1.0" encoding="UTF-8" ?>
<gs_provision version="1">
<config version="1">
<!-- ${comment} -->
</config>
</gs_provision>`;
  return new NextResponse(content, {
    status: 200,
    headers: { "content-type": "application/xml; charset=utf-8", "x-provisioning-vendor": "grandstream" },
  });
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/provisioning/grandstream/[mac]">
) {
  const { mac: rawMac } = await context.params;

  // Grandstream requests cfg.xml, then cfgGXP<model>.xml (any model), then cfg<MAC>.xml
  if (/^cfgGXP\d+\.xml$/i.test(rawMac)) {
    return emptyGrandstreamProvisionXml(`model stub ${rawMac}`);
  }

  // Grandstream requests: cfg<MAC>.xml, cfg<MAC>, <MAC>.xml or bare <MAC>
  const mac = rawMac
    .replace(/^cfg/i, "")
    .replace(/\.(xml|cfg|txt)$/i, "")
    .replace(/[^a-fA-F0-9]/g, "");

  if (!isValidMac(mac)) {
    // Other model-specific files (non-MAC) — return empty XML so the phone continues to cfg<MAC>.xml
    if (/^cfg/i.test(rawMac) && /\.xml$/i.test(rawMac)) {
      return emptyGrandstreamProvisionXml(`non-mac stub ${rawMac}`);
    }
    const errBody = `<?xml version="1.0" encoding="UTF-8" ?>
<gs_provision version="1">
<config version="1">
<!-- error: invalid MAC in request path -->
</config>
</gs_provision>`;
    return new NextResponse(errBody, {
      status: 400,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "x-provisioning-vendor": "grandstream",
        "x-provisioning-error": "invalid-mac",
      },
    });
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

    // XML plutôt que JSON : certains téléphones parsent mal une erreur JSON comme fichier de config.
    const body = `<?xml version="1.0" encoding="UTF-8" ?>
<gs_provision version="1">
<config version="1">
<!-- error: phone not registered for MAC ${normalizedMac} -->
</config>
</gs_provision>`;
    return new NextResponse(body, {
      status: 404,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "x-provisioning-vendor": "grandstream",
        "x-provisioning-error": "phone-not-found",
      },
    });
  }

  const resolved = await getResolvedProvisioningRules(phone);

  // CORRECTION: Utiliser format texte (Pxxx=valeur) au lieu de XML - plus fiable pour Grandstream
  const content = renderGrandstreamText(phone, resolved.resolvedEntries);

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
      "content-type": "application/xml; charset=utf-8",
      "x-provisioning-vendor": "grandstream",
      "x-device-mac": normalizedMac,
      "x-provisioning-rules": String(resolved.resolvedEntries.length),
    },
  });
}
