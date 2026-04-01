import type { Vendor } from "@prisma/client";

import type { ResolvedRuleEntry } from "@/lib/provisioning/rules";

export const supportedVendors = ["yealink", "grandstream"] as const;

export type SupportedVendor = (typeof supportedVendors)[number];

export function isSupportedVendor(value: string): value is SupportedVendor {
  return supportedVendors.includes(value as SupportedVendor);
}

export function normalizeMac(value: string): string {
  return value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

export function isValidMac(value: string): boolean {
  return normalizeMac(value).length === 12;
}

export function prismaVendorToSupportedVendor(vendor: Vendor): SupportedVendor {
  return vendor === "YEALINK" ? "yealink" : "grandstream";
}

export function getProvisioningBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return appUrl && appUrl.length > 0 ? appUrl.replace(/\/$/, "") : "http://localhost:3000";
}

function defaultRulesForVendor(vendor: SupportedVendor, mac: string) {
  const baseUrl = getProvisioningBaseUrl();

  if (vendor === "yealink") {
    return [
      { key: "account.1.enable", value: "0" },
      { key: "auto_provision.server.url", value: `${baseUrl}/api/provisioning/yealink/${mac}` },
      { key: "local_time.time_zone", value: "-5" },
      { key: "local_time.time_zone_name", value: "Eastern Time" },
    ];
  }

  return [
    { key: "P271", value: "0" },
    { key: "P237", value: `${baseUrl}/api/provisioning/grandstream/${mac}` },
    { key: "P64", value: "-5" },
    { key: "P246", value: "1" },
  ];
}

export function renderProvisioningConfig(
  vendor: SupportedVendor,
  mac: string,
  resolvedEntries: ResolvedRuleEntry[] = []
) {
  const normalizedMac = normalizeMac(mac);
  const mergedRules = new Map<string, string>();

  for (const rule of defaultRulesForVendor(vendor, normalizedMac)) {
    mergedRules.set(rule.key, rule.value);
  }

  for (const entry of resolvedEntries) {
    mergedRules.set(entry.key, entry.value);
  }

  const header =
    vendor === "yealink"
      ? ["#!version:1.0.0.1", `## Auto-generated for ${normalizedMac}`]
      : ["# Grandstream generated configuration", `# Auto-generated for ${normalizedMac}`];

  const body = Array.from(mergedRules.entries()).map(([key, value]) => `${key} = ${value}`);

  return [...header, ...body].join("\n");
}
