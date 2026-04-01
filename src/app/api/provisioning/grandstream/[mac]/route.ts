import { NextResponse } from "next/server";

import { isValidMac, normalizeMac, renderProvisioningConfig } from "@/lib/provisioning/vendors";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/provisioning/grandstream/[mac]">
) {
  const { mac } = await context.params;

  if (!isValidMac(mac)) {
    return NextResponse.json(
      { ok: false, error: "Invalid MAC address" },
      { status: 400 }
    );
  }

  const normalizedMac = normalizeMac(mac);
  const content = renderProvisioningConfig("grandstream", normalizedMac);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-provisioning-vendor": "grandstream",
      "x-device-mac": normalizedMac,
    },
  });
}
