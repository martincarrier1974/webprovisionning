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
      ["auto_provision.repeat.minutes", "10080"],
      ["local_time.time_zone_name", timezone],
      ["local_time.time_zone", "-5"],
      ["local_time.ntp_server1", "pool.ntp.org"],
      ["static.network.dhcp_enable", "1"],
      ["features.dnd.allow", "1"],
      ["call_waiting.enable", "1"],
      ["call_waiting.mode", "0"],
      ["call_waiting.tone", "1"],
      ["voice.tone.country", "Canada"],
      ["lang.gui", context.client.defaultLanguage === "fr" ? "French" : "English"],
      ["network.ntp.time_server", "pool.ntp.org"],
      ["features.call_log_enable", "1"],
      // Display / LCD
      ["backlight.active_time", "1"],
      ["backlight.active_level", "100"],
      ["backlight.inactive_level", "60"],
      ["features.blf_led_mode", "0"],
      ["phone_setting.mwi_indicator.enable", "1"],
      // Codecs audio
      ["account.1.codec.1.enable", "1"],
      ["account.1.codec.1.payload_type", "PCMU"],  // G.711u
      ["account.1.codec.2.enable", "1"],
      ["account.1.codec.2.payload_type", "PCMA"],  // G.711a
      ["account.1.codec.3.enable", "1"],
      ["account.1.codec.3.payload_type", "G722"],  // HD audio
      ["account.1.codec.4.enable", "1"],
      ["account.1.codec.4.payload_type", "G729"],
      ["account.1.codec.5.enable", "0"],
      // SIP / Security
      ["account.1.sip_server.1.port", "5060"],
      ["account.1.srtp_encryption", "0"],          // 0=disabled, 1=optional, 2=mandatory
      // PC port
      ["network.pc_port.enable", "1"],
      // Ring tone
      ["phone_setting.ring_type", "Ring1.wav"],
      // Programmable keys globals
      ["linekey.key_mode", "0"],        // 0=LineMode
      ["linekey.show_label", "1"],
      ["features.blf_pickup_code", "**"],
      ...(firmwareUrl ? [["auto_provision.firmware.url", firmwareUrl]] : []),
    ] as Array<[string, string]>;
  }

  return [
    // Account / SIP
    ["P271", context.sipUsername ? "1" : "0"],   // Account active
    ["P270", context.label || context.extensionNumber || context.client.name], // Display name
    ["P47", context.sipUsername || ""],           // SIP User ID
    ["P34", context.sipUsername || ""],           // Auth ID
    ["P35", context.sipPassword || ""],           // SIP Password
    ["P192", context.sipServer || ""],            // SIP Server
    ["P2", context.adminPassword || "admin"],     // Admin password
    // Provisioning
    ["P237", `${baseUrl}/api/provisioning/grandstream/${context.macAddress}`], // Config server
    ["P145", "3"],                                // Firmware upgrade: always check
    // NTP / Time
    ["P212", "pool.ntp.org"],                     // NTP server
    ["P64", "-5"],                                // Timezone offset (EST)
    ["P246", yesNo(Boolean(context.sipUsername))],
    // Language
    ["P331", context.client.defaultLanguage === "fr" ? "fr" : "en"],
    // Call features
    ["P52", "1"],    // Enable Call Waiting
    ["P55", "1"],    // Enable Transfer
    ["P56", "1"],    // Enable Conference
    // Network - VLAN (disabled by default; overridden by phone-level provisioning rules)
    ["P3", "0"],     // VLAN Tag (802.1Q)
    ["P4", "0"],     // 802.1p Priority Value
    // Display / LCD
    ["P234", yesNo(true)],
    ["P240", yesNo(true)],
    ["P96", "1"],    // Active backlight timeout (minutes)
    ["P324", "100"], // LCD brightness active
    ["P325", "60"],  // LCD brightness idle
    ["P195", "1"],   // Enable MWI indicator
    // ── Codecs ───────────────────────────────────────────────────────────────
    ["P57", "0"],    // Codec 1: PCMU (G.711u)
    ["P58", "8"],    // Codec 2: PCMA (G.711a)
    ["P59", "9"],    // Codec 3: G.722
    ["P60", "18"],   // Codec 4: G.729
    ["P103", "101"], // DTMF Payload Type
    ["P98", "1"],    // Send DTMF via RTP (RFC2833)
    ["P97", "0"],    // Send DTMF in-audio
    ["P99", "0"],    // Send DTMF via SIP INFO
    ["P106", "0"],   // Silence Suppression
    ["P137", "2"],   // Voice Frames per TX
    ["P1300", "1"],  // Use First Matching Vocoder in 200OK SDP

    // ── SIP / Registration ────────────────────────────────────────────────
    ["P23", "5060"],  // Local SIP Port
    ["P91", "60"],    // REGISTER Expiration (s)
    ["P92", "20"],    // Registration Retry Wait Time (s)
    ["P1395", "1"],   // Enable OPTIONS Keep-Alive
    ["P1396", "30"],  // OPTIONS Keep-Alive Interval
    ["P1397", "3"],   // OPTIONS Keep-Alive Max Retries
    ["P1042", "0"],   // SIP Transport: 0=UDP
    ["P1083", "0"],   // Add Auth Header on Initial REGISTER
    ["P1081", "0"],   // Enable 100rel
    ["P1085", "0"],   // SUBSCRIBE for MWI
    ["P1086", "60"],  // SUBSCRIBE Expiration
    ["P1099", "0"],   // Support SIP Instance ID
    ["P1043", "0"],   // UNREGISTER on Reboot
    ["P1084", "0"],   // PUBLISH for Presence
    // Session Timer
    ["P1170", "1"],   // Enable Session Timer
    ["P1172", "90"],  // Min-SE
    ["P1171", "180"], // Session Expiration
    ["P1173", "0"],   // Force INVITE
    // SIP T1/T2
    ["P1120", "500"], // SIP T1 Timeout (ms)
    ["P1121", "4000"],// SIP T2 Timeout (ms)
    // P-Headers
    ["P1183", "1"],   // Use P-Access-Network-Info Header
    ["P1184", "1"],   // Use P-Emergency-Info Header
    ["P1185", "1"],   // Use X-Grandstream-PBX Header
    ["P1186", "0"],   // Add MAC in User-Agent

    // ── Security (Account Advanced) ───────────────────────────────────────
    ["P426", "1"],   // Accept Incoming SIP from Proxy Only
    ["P427", "0"],   // Allow SIP Reset
    ["P428", "0"],   // Allow Unsolicited REFER
    ["P429", "1"],   // Authenticate Incoming INVITE
    ["P430", "0"],   // Check Domain Certificates
    ["P431", "0"],   // Check SIP User ID for Incoming INVITE
    ["P432", "0"],   // Validate Certificate Chain
    ["P433", "0"],   // Validate Incoming SIP Messages

    // ── Call Settings ─────────────────────────────────────────────────────
    ["P80", "0"],    // Anonymous Call Rejection
    ["P81", "0"],    // Send Anonymous
    ["P85", "60"],   // Ring Timeout (s)
    ["P301", "1"],   // Refer-To Use Target Contact
    ["P88", "0"],    // RFC2543 Hold
    ["P284", "30"],  // Blind Transfer Wait Timeout (s)
    ["P1474", "20"], // Call Forward No Answer Timeout (s)
    ["P1475", "0"],  // Enable Local Call Features
    ["P86", "1"],    // Ignore Alert-Info header

    // ── Intercom ─────────────────────────────────────────────────────────
    ["P1371", "1"],  // Allow Auto Answer by Call-Info/Alert-Info
    ["P1372", "0"],  // Mute on Intercom Answer

    // ── General Settings ──────────────────────────────────────────────────
    ["P1167", "0"],  // Account Display: 0=User Name, 1=User ID

    // ── SRTP ──────────────────────────────────────────────────────────────
    ["P183", "0"],   // SRTP Mode: 0=disabled
    ["P1330", "0"],  // Crypto Life Time
    ["P1331", "0"],  // Symmetric RTP

    // ── PC port ───────────────────────────────────────────────────────────
    ["P329", "1"],   // Enable PC port

    // ── Programmable keys globals ─────────────────────────────────────────
    ["P1362", "0"],  // Key mode: 0=LineMode, 1=AccountMode
    ["P1363", "1"],  // Show keys label
    ["P1464", "**"], // BLF call-pickup prefix

    // ── Firmware ──────────────────────────────────────────────────────────
    ...(firmwareUrl ? [["P232", firmwareUrl]] : []),
  ] as Array<[string, string]>;
}

function buildProgrammableKeyEntries(vendor: SupportedVendor, context: PhoneProvisioningContext): Array<[string, string]> {
  const keys = context.programmableKeys ?? [];
  if (keys.length === 0) return [];

  const entries: Array<[string, string]> = [];

  if (vendor === "yealink") {
    for (const key of keys) {
      const idx = key.keyIndex;
      const modeMap: Record<string, string> = {
        BLF: "16",
        SPEED_DIAL: "13",
        CALL_PARK: "19",
        INTERCOM: "5",
        FORWARD: "4",
        DND: "6",
        RECORD: "11",
        DEFAULT: "0",
        NONE: "0",
      };
      const typeCode = modeMap[key.mode] ?? "0";
      entries.push([`linekey.${idx}.type`, typeCode]);
      entries.push([`linekey.${idx}.value`, key.value ?? ""]);
      entries.push([`linekey.${idx}.label`, key.description ?? ""]);
      entries.push([`linekey.${idx}.line`, "1"]);
      if (key.locked) entries.push([`linekey.${idx}.locked`, "1"]);
    }
  } else {
    // Grandstream: MPK physiques (P323+) et VMPK (P1400+) selon modèle
    // GXP2130/2135 : 8 MPK physiques (idx 1-8) + jusqu'à 16 VMPK (idx 9-24)
    // GXP2160      : 24 MPK physiques
    // GXP2170      : 48 MPK physiques
    // GXP16xx      : pas de MPK physique → VMPK seulement
    const modelCode = context.phoneModel.modelCode.toUpperCase();
    const physicalCapacity = context.phoneModel.lineCapacity ?? 0;

    // Modèles avec VMPK (P1400+) : GXP2130, GXP2135, et les GXP1xxx
    const hasVmpk = ["GXP2130", "GXP2135", "GXP1610", "GXP1615", "GXP1620", "GXP1625", "GXP1628", "GXP1630"].includes(modelCode);

    const modeMap: Record<string, string> = {
      BLF: "16",
      SPEED_DIAL: "0",
      CALL_PARK: "58",
      INTERCOM: "8",
      FORWARD: "7",
      DND: "10",
      RECORD: "17",
      DEFAULT: "0",
      NONE: "0",
    };

    for (const key of keys) {
      const idx = key.keyIndex - 1; // 0-indexed
      const typeCode = modeMap[key.mode] ?? "0";

      if (hasVmpk && key.keyIndex > physicalCapacity) {
        // VMPK (Virtual MPK) — P1400-based, 0-indexed global
        const vIdx = idx; // keyIndex - 1
        entries.push([`P${1400 + vIdx * 4}`, typeCode]);          // VMPK mode
        entries.push([`P${1401 + vIdx * 4}`, key.account ?? "1"]); // account
        entries.push([`P${1402 + vIdx * 4}`, key.value ?? ""]);    // value
        entries.push([`P${1403 + vIdx * 4}`, key.description ?? ""]); // label
      } else {
        // MPK physique — P323-based
        entries.push([`P${323 + idx * 4}`, typeCode]);
        entries.push([`P${324 + idx * 4}`, key.account ?? "1"]);
        entries.push([`P${325 + idx * 4}`, key.value ?? ""]);
        entries.push([`P${326 + idx * 4}`, key.description ?? ""]);
      }
    }
  }

  return entries;
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

  // Inject programmable key entries (can be overridden by explicit rules)
  for (const [key, value] of buildProgrammableKeyEntries(vendor, context)) {
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
