import { stringify } from "csv-stringify/sync";

import { db } from "@/lib/db";

export async function exportPhonesCsv() {
  const phones = await db.phone.findMany({
    orderBy: [{ client: { name: "asc" } }, { label: "asc" }],
    include: {
      client: { select: { name: true, slug: true } },
      site: { select: { name: true, slug: true } },
      phoneModel: { select: { vendor: true, modelCode: true, displayName: true } },
    },
  });

  const records = phones.map((phone) => ({
    id: phone.id,
    client_name: phone.client.name,
    client_slug: phone.client.slug,
    site_name: phone.site?.name ?? "",
    site_slug: phone.site?.slug ?? "",
    vendor: phone.phoneModel.vendor,
    model_code: phone.phoneModel.modelCode,
    model_name: phone.phoneModel.displayName,
    mac_address: phone.macAddress,
    label: phone.label ?? "",
    extension_number: phone.extensionNumber ?? "",
    sip_username: phone.sipUsername ?? "",
    sip_server: phone.sipServer ?? "",
    status: phone.status,
  }));

  return stringify(records, {
    header: true,
  });
}
