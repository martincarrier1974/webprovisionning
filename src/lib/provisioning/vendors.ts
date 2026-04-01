import type { Vendor } from "@prisma/client";

import type { PhoneProvisioningContext, ResolvedRuleEntry } from "@/lib/provisioning/rules";

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

function formatValue(value: string) {
  if (value === "") return '""';
  if (/\s/.test(value) || value.includes(",") || value.includes(";")) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function yesNo(value: boolean) {
  return value ? "1" : "0";
}

function buildBaseEntries(vendor: SupportedVendor, context: PhoneProvisioningContext) {
  const baseUrl = getProvisioningBaseUrl();
  const timezone = context.site?.timezone || context.client.timezone || "America/Toronto";
  const firmwareUrl = context.firmwareTarget
    ? `${baseUrl}/firmware/${context.firmwareTarget.storageKey}`
    : null;

  if (vendor === "yealink") {
    return [
      ["account.1.enable", context.sipUsername ? "1" : "0"],
      ["account.1.label", context.label || context.extensionNumber || context.client.name],
      ["account.1.display_name", context.label || context.client.name],
      ["account.1.user_name", context.sipUsername || ""],
      ["account.1.auth_name", context.sipUsername || ""],
      ["account.1.password", context.sipPassword || ""],
      ["account.1.sip_server.1.address", context.sipServer || ""],
      ["account.1.sip_server.1.port", "5060"],
      ["account.1.sip_server.1.transport_type", "0"],
      ["phone_setting.admin_password", context.adminPassword || "admin"],
      ["security.user_password", context.webPassword || "user"],
      ["auto_provision.server.url", `${baseUrl}/api/provisioning/yealink/${context.macAddress}`],
      ["auto_provision.repeat.enable", "1"],
      ["auto_provision.repeat.minutes", "60"],
      ["local_time.time_zone_name", timezone],
      ["local_time.time_zone", "-5"],
      ["local_time.ntp_server1", "pool.ntp.org"],
      ["static.network.dhcp_enable", "1"],
      ["features.dnd.allow", "1"],
      ["call_waiting.enable", "1"],
      ["voice.tone.country", "Canada"],
      ["lang.gui", context.client.defaultLanguage === "fr" ? "French" : "English"],
      ["network.ntp.time_server", "pool.ntp.org"],
      ["features.call_log_enable", "1"],
      ...(firmwareUrl ? [["auto_provision.firmware.url", firmwareUrl]] : []),
    ] as Array<[string, string]>;
  }

  return [
    ["P271", context.sipUsername ? "1" : "0"],
    ["P270", context.label || context.extensionNumber || context.client.name],
    ["P47", context.sipUsername || ""],
    ["P35", context.sipPassword || ""],
    ["P47", context.sipUsername || ""],
    ["P237", `${baseUrl}/api/provisioning/grandstream/${context.macAddress}`],
    ["P192", context.sipServer || ""],
    ["P35", context.sipPassword || ""],
    ["P2", context.adminPassword || "admin"],
    ["P64", "-5"],
    ["P246", yesNo(Boolean(context.sipUsername))],
    ["P212", "pool.ntp.org"],
    ["P331", context.client.defaultLanguage === "fr" ? "fr" : "en"],
    ["P234", yesNo(true)],
    ["P240", yesNo(true)],
    ...(firmwareUrl ? [["firmware.url", firmwareUrl]] : []),
  ] as Array<[string, string]>;
}

export function renderProvisioningConfig(
  vendor: SupportedVendor,
  context: PhoneProvisioningContext,
  resolvedEntries: ResolvedRuleEntry[] = []
) {
  const normalizedMac = normalizeMac(context.macAddress);
  const mergedRules = new Map<string, string>();

  for (const [key, value] of buildBaseEntries(vendor, context)) {
    mergedRules.set(key, value);
  }

  for (const entry of resolvedEntries) {
    mergedRules.set(entry.key, entry.value);
  }

  const header =
    vendor === "yealink"
      ? ["#!version:1.0.0.1", `## Auto-generated for ${normalizedMac}`, `## Model ${context.phoneModel.displayName}`]
      : ["# Grandstream generated configuration", `# Auto-generated for ${normalizedMac}`, `# Model ${context.phoneModel.displayName}`];

  const body = Array.from(mergedRules.entries()).map(([key, value]) => `${key} = ${formatValue(value)}`);

  return [...header, ...body].join("\n");
}
