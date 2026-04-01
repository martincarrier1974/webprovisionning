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

export function renderProvisioningConfig(vendor: SupportedVendor, mac: string) {
  const normalizedMac = normalizeMac(mac);

  if (vendor === "yealink") {
    return [
      "#!version:1.0.0.1",
      `## Auto-generated for ${normalizedMac}`,
      "account.1.enable = 0",
      `auto_provision.server.url = http://localhost:3000/api/provisioning/yealink/${normalizedMac}`,
      'local_time.time_zone = -5',
      'local_time.time_zone_name = Eastern Time',
    ].join("\n");
  }

  return [
    "# Grandstream sample configuration",
    `# Auto-generated for ${normalizedMac}`,
    'P271=0',
    `P237=http://localhost:3000/api/provisioning/grandstream/${normalizedMac}`,
    'P64=-5',
    'P246=1',
  ].join("\n");
}
