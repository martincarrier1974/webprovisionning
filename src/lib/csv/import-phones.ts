import { parse } from "csv-parse/sync";

import { db } from "@/lib/db";
import { macAsColonSeparated, phoneMacMatchWhere } from "@/lib/mac-address";

type ImportRow = {
  mac_address: string;
  client_slug: string;
  site_slug?: string;
  model_code: string;
  label?: string;
  extension_number?: string;
  sip_username?: string;
  sip_password?: string;
  sip_server?: string;
  web_password?: string;
  admin_password?: string;
};

export type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; mac: string; reason: string }[];
};

export async function importPhonesCsv(csvText: string): Promise<ImportResult> {
  const rows: ImportRow[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: ImportResult = {
    total: rows.length,
    created: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header
    const mac = (row.mac_address || "").toUpperCase().replace(/[^A-F0-9]/g, "");

    if (mac.length !== 12) {
      result.errors.push({ row: rowNum, mac: row.mac_address || "", reason: "MAC invalide" });
      continue;
    }

    const macDisplay = macAsColonSeparated(mac);

    if (!row.client_slug) {
      result.errors.push({ row: rowNum, mac: macDisplay, reason: "client_slug requis" });
      continue;
    }

    if (!row.model_code) {
      result.errors.push({ row: rowNum, mac: macDisplay, reason: "model_code requis" });
      continue;
    }

    const client = await db.client.findUnique({ where: { slug: row.client_slug } });
    if (!client) {
      result.errors.push({ row: rowNum, mac: macDisplay, reason: `Client "${row.client_slug}" introuvable` });
      continue;
    }

    const phoneModel = await db.phoneModel.findFirst({ where: { modelCode: row.model_code, isActive: true } });
    if (!phoneModel) {
      result.errors.push({ row: rowNum, mac: macDisplay, reason: `Modèle "${row.model_code}" introuvable` });
      continue;
    }

    let siteId: string | null = null;
    if (row.site_slug) {
      const site = await db.site.findFirst({
        where: { slug: row.site_slug, clientId: client.id },
      });
      if (!site) {
        result.errors.push({ row: rowNum, mac: macDisplay, reason: `Site "${row.site_slug}" introuvable pour ce client` });
        continue;
      }
      siteId = site.id;
    }

    const existing = await db.phone.findFirst({
      where: phoneMacMatchWhere(mac),
    });
    if (existing) {
      result.skipped++;
      continue;
    }

    await db.phone.create({
      data: {
        macAddress: mac,
        clientId: client.id,
        siteId,
        phoneModelId: phoneModel.id,
        label: row.label || null,
        extensionNumber: row.extension_number || null,
        sipUsername: row.sip_username || null,
        sipPassword: row.sip_password || null,
        sipServer: row.sip_server || null,
        webPassword: row.web_password || null,
        adminPassword: row.admin_password || null,
      },
    });

    result.created++;
  }

  return result;
}
