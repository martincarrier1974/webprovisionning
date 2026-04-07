import type { Vendor } from "@prisma/client";

import type { PhoneProvisioningContext, ResolvedRuleEntry } from "@/lib/provisioning/rules";

export const supportedVendors = ["yealink", "grandstream", "snom"] as const;

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
  if (vendor === "YEALINK") return "yealink";
  if (vendor === "SNOM") return "snom";
  return "grandstream";
}

export function getProvisioningBaseUrl() {
  const appUrl = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  return appUrl.length > 0 ? appUrl.replace(/\/$/, "") : "http://localhost:3000";
}

export function getFirmwareBaseUrl() {
  const firmwareBaseUrl = (process.env.FIRMWARE_BASE_URL ?? "").trim();
  return firmwareBaseUrl.length > 0 ? firmwareBaseUrl.replace(/\/$/, "") : null;
}

function formatValue(value: string) {
  // Yealink n'accepte pas les guillemets - retourner la valeur telle quelle (vide = vide)
  if (value === "") return "";
  if (/\s/.test(value) || value.includes(",") || value.includes(";")) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function yesNo(value: boolean) {
  return value ? "1" : "0";
}

/** L'UI envoie « Account1 »...« Account6 » ; les P-codes MPK/VMPK Grandstream attendent 1...6. */
function grandstreamAccountIndexFromUi(account: string | null | undefined): string {
  const raw = (account ?? "").trim();
  const m = /^Account(\d+)$/i.exec(raw);
  if (m) return m[1];
  if (/^\d+$/.test(raw)) return raw;
  return "1";
}

function splitHostPort(value: string | null | undefined): { host: string; port: string } {
  const raw = (value ?? "").trim();
  if (raw.length === 0) return { host: "", port: "5060" };

  // [IPv6]:port
  if (raw.startsWith("[") && raw.includes("]:")) {
    const end = raw.indexOf("]:");
    const port = raw.slice(end + 2);
    if (/^\d{2,5}$/.test(port)) {
      return { host: raw.slice(0, end + 1), port };
    }
  }

  // hostname or IPv4: last colon + numeric port (avoids greedy (.*) matching wrong segment)
  const lastColon = raw.lastIndexOf(":");
  if (lastColon > 0) {
    const possibleHost = raw.slice(0, lastColon).trim();
    const possiblePort = raw.slice(lastColon + 1);
    if (/^\d{2,5}$/.test(possiblePort)) {
      if (possibleHost.includes(":") && !possibleHost.startsWith("[")) {
        return { host: raw, port: "5060" };
      }
      return { host: possibleHost, port: possiblePort };
    }
  }

  return { host: raw, port: "5060" };
}

/**
 * GXP21xx P212 = « Upgrade via » (téléchargement config / firmware).
 * Beaucoup de firmwares n'acceptent que 0=TFTP et 1=HTTP ; le HTTPS suit souvent l'URL dans P237 quand P212=1.
 * Mettre 2 (HTTPS explicite) peut empêcher tout téléchargement sur anciennes versions.
 * Surcharge : GRANDSTREAM_P212_UPGRADE_VIA=1|2|0
 * Si P237 est HTTPS, on force P212=2 pour être sûr.
 */
function grandstreamUpgradeViaCode(baseUrl: string): string {
  const override = (process.env.GRANDSTREAM_P212_UPGRADE_VIA ?? "").trim();
  if (override && /^\d+$/.test(override)) return override;

  // Si l'URL de base est HTTPS, utiliser 2 (HTTPS), sinon 1 (HTTP)
  if (baseUrl.startsWith("https://")) {
    return "2";
  }
  return "1";
}

function formatGrandstreamPrimarySipServer(sipServer: string | null | undefined): string {
  const split = splitHostPort(sipServer);
  if (!split.host) return "";
  return split.port !== "5060" ? `${split.host}:${split.port}` : split.host;
}

/** After merging rules, split any account.*.sip_server.*.address that still contains :port */
function normalizeYealinkSipServerAddresses(mergedRules: Map<string, string>) {
  const addressKeyRe = /^account\.(\d+)\.sip_server\.(\d+)\.address$/;
  for (const [key, value] of [...mergedRules.entries()]) {
    const m = key.match(addressKeyRe);
    if (!m) continue;
    const raw = (value ?? "").trim();
    if (!raw.includes(":")) continue;
    const split = splitHostPort(raw);
    if (split.host === raw) continue;
    mergedRules.set(key, split.host);
    mergedRules.set(`account.${m[1]}.sip_server.${m[2]}.port`, split.port);
  }
}

function buildBaseEntries(vendor: SupportedVendor, context: PhoneProvisioningContext) {
  const baseUrl = getProvisioningBaseUrl();
  const timezone = context.site?.timezone || context.client.timezone || "America/Toronto";
  const firmwareBaseUrl = getFirmwareBaseUrl();
  // URL directe vers le fichier firmware assigné au téléphone (si aucun FIRMWARE_BASE_URL n'est défini)
  const firmwareUrl = context.firmwareTarget
    ? `${baseUrl}/api/firmware/${context.firmwareTarget.storageKey}`
    : null;
  // URL de dossier virtuel par modèle - Grandstream P192 attend un répertoire de base
  const firmwareFolderUrl = context.firmwareTarget
    ? `${baseUrl}/api/firmware/${context.phoneModel.vendor.toLowerCase()}/${context.phoneModel.modelCode.toUpperCase()}/`
    : null;

  if (vendor === "yealink") {
    const sipServer = splitHostPort(context.sipServer);
    return [
      // ── Account / SIP ─────────────────────────────────────────────────
      ["account.1.enable", context.sipUsername ? "1" : "0"],
      ["account.1.label", context.label || context.extensionNumber || context.client.name],
      ["account.1.display_name", context.label || context.client.name],
      ["account.1.user_name", context.sipUsername || ""],
      ["account.1.auth_name", context.sipUsername || ""],
      ["account.1.password", context.sipPassword || ""],
      ["account.1.sip_server.1.address", sipServer.host],
      ["account.1.sip_server.1.port", sipServer.port],
      ["account.1.sip_server.1.transport_type", "0"],  // 0=UDP
      ["account.1.sip_server.1.expires", "60"],
      ["account.1.sip_server.1.retry_counts", "3"],
      // Backup SIP server: must be sent explicitly or Yealink keeps previous values on device
      ["account.1.sip_server.2.address", ""],
      ["account.1.sip_server.2.port", "5060"],
      ["account.1.sip_server.2.transport_type", "0"],
      ["account.1.reg_fail_retry_interval", "20"],
      ["account.1.subscribe_mwi", "0"],
      ["account.1.100rel_enable", "0"],
      // Security
      ["account.1.sip_trust_ctrl", "1"],           // Accept SIP from proxy only
      ["account.1.blf_pickup_code", "**"],
      // SRTP
      ["account.1.srtp_encryption", "0"],          // 0=disabled
      // Session Timer
      ["account.1.session_timer.enable", "1"],
      ["account.1.session_timer.expires", "180"],
      ["account.1.session_timer.refresher", "0"],  // 0=UAC
      // DTMF
      ["account.1.dtmf.type", "1"],                // 1=RFC2833
      ["account.1.dtmf.info_type", "0"],
      ["account.1.dtmf.payload", "101"],
      // Call features
      ["account.1.auto_answer", "0"],
      ["account.1.auto_answer.mute", "0"],
      ["account.1.call_waiting.enable", "1"],
      ["account.1.call_waiting.tone", "1"],
      ["account.1.transfer.enable", "1"],
      ["account.1.conference.enable", "1"],
      ["account.1.anonymous_call", "0"],
      ["account.1.anonymous_call_rejection", "0"],
      ["account.1.ring_type", "Ring1.wav"],
      // Caller ID
      ["account.1.caller_id_source", "0"],         // 0=From header

      // ── Passwords ─────────────────────────────────────────────────────
      ["phone_setting.admin_password", context.adminPassword || "admin"],
      ["security.user_password", context.webPassword || "user"],

      // ── Auto Provision ────────────────────────────────────────────────
      // Directory URL + trailing slash: Yealink requests y000000000000.cfg then <MAC>.cfg (not a single full file URL).
      ["auto_provision.server.url", `${baseUrl}/api/provisioning/yealink/`],
      ["auto_provision.repeat.enable", "1"],
      ["auto_provision.repeat.minutes", "10080"],  // hebdomadaire
      ["auto_provision.check.new_config", "1"],
      ["auto_provision.overwrite_mode", "1"],       // 1=forcer écrasement des réglages manuels du téléphone

      // ── Time / Date / Language ────────────────────────────────────────
      ["local_time.time_zone_name", timezone],
      ["local_time.time_zone", "-5"],
      ["local_time.ntp_server1", "pool.ntp.org"],
      ["local_time.ntp_server2", ""],
      ["local_time.interval", "1440"],             // NTP sync interval (min)
      ["local_time.time_format", "0"],             // 0=12h, 1=24h
      ["local_time.date_format", "2"],             // 2=YYYY-MM-DD
      ["lang.gui", context.client.defaultLanguage === "fr" ? "French" : "English"],
      ["lang.input.extended.char", "1"],

      // ── Network ───────────────────────────────────────────────────────
      ["static.network.dhcp_enable", "1"],
      ["network.pc_port.enable", "1"],
      ["network.vlan.internet_port_enable", "0"],  // VLAN disabled by default
      ["network.vlan.internet_port_vid", "0"],
      ["network.vlan.internet_port_priority", "0"],
      ["network.ntp.time_server", "pool.ntp.org"],
      ["network.quality_of_service.rtptos", "46"], // DSCP EF for RTP

      // ── Display / LCD ─────────────────────────────────────────────────
      ["backlight.active_time", "1"],
      ["backlight.active_level", "100"],
      ["backlight.inactive_level", "60"],
      ["features.blf_led_mode", "0"],
      ["phone_setting.mwi_indicator.enable", "1"],
      ["phone_setting.show_date_time_as_screensaver", "0"],

      // ── Call features (global) ────────────────────────────────────────
      ["features.dnd.allow", "1"],
      ["call_waiting.enable", "1"],
      ["call_waiting.mode", "0"],
      ["call_waiting.tone", "1"],
      ["features.call_log_enable", "1"],
      ["features.pickup.direct_pickup_code", "**"],
      ["features.blf_pickup_code", "**"],
      ["features.intercom.allow", "1"],
      ["features.intercom.mute", "0"],
      ["features.intercom.tone", "1"],
      ["features.intercom.barge", "1"],
      ["voice.tone.country", "Canada"],
      ["phone_setting.ring_type", "Ring1.wav"],
      ["phone_setting.lock_volume", "0"],

      // ── Codecs ────────────────────────────────────────────────────────
      ["account.1.codec.1.enable", "1"],
      ["account.1.codec.1.payload_type", "PCMU"],  // G.711u
      ["account.1.codec.1.priority", "1"],
      ["account.1.codec.2.enable", "1"],
      ["account.1.codec.2.payload_type", "PCMA"],  // G.711a
      ["account.1.codec.2.priority", "2"],
      ["account.1.codec.3.enable", "1"],
      ["account.1.codec.3.payload_type", "G722"],  // HD
      ["account.1.codec.3.priority", "3"],
      ["account.1.codec.4.enable", "1"],
      ["account.1.codec.4.payload_type", "G729"],
      ["account.1.codec.4.priority", "4"],
      ["account.1.codec.5.enable", "0"],
      ["account.1.codec.5.payload_type", "iLBC"],
      ["account.1.vad_enable", "0"],               // Silence suppression off
      ["account.1.rtcp.enable", "1"],

      // ── Programmable keys globals ─────────────────────────────────────
      ["linekey.key_mode", "1"],                   // 1=AccountMode - permet de configurer les touches librement (BLF, SpeedDial, etc.)
      ["linekey.show_label", "1"],
      ["features.blf_pickup_code", "**"],

      // ── LDAP ──────────────────────────────────────────────────────────
      ["ldap.enable", "0"],
      ["ldap.server", ""],
      ["ldap.port", "389"],
      ["ldap.version", "3"],
      ["ldap.max_hits", "50"],
      ["ldap.search_timeout", "30"],
      ["ldap.call_in_lookup", "0"],
      ["ldap.call_out_lookup", "0"],

      ...(firmwareBaseUrl ? [["auto_provision.firmware.url", firmwareBaseUrl]] : firmwareUrl ? [["auto_provision.firmware.url", firmwareUrl]] : []),
    ] as Array<[string, string]>;
  }

  const sip1 = formatGrandstreamPrimarySipServer(context.sipServer);

  return [
    // Account / SIP (GXP21xx: P47 = serveur SIP, P35 = User ID, P34 = mot de passe, P36 = Auth ID)
    ["P271", context.sipUsername ? "1" : "0"],   // Account active
    ["P270", context.label || context.extensionNumber || context.client.name], // Display name
    ["P47", sip1],                                // Primary SIP Server (hôte ou hôte:port)
    ["P35", context.sipUsername || ""],           // SIP User ID
    ["P34", context.sipPassword || ""],           // Authenticate Password
    ["P36", context.sipUsername || ""],           // Authenticate ID
    ["P192", firmwareBaseUrl || firmwareFolderUrl || ""], // Firmware Server Path — doit être un répertoire (le téléphone ajoute le nom du fichier)
    // P232 retiré (doublon avec P192)
    ["P2", context.adminPassword || "admin"],     // Admin password
    // Provisioning
    ["P237", `${baseUrl}/api/provisioning/grandstream/`], // Config server base path (phone appends cfgMAC.xml)
    ["P212", grandstreamUpgradeViaCode(baseUrl)], // 1=HTTP 2=HTTPS - requis pour télécharger cfg depuis P237
    ["P145", "0"],                                // Ne pas laisser DHCP Option 43/66 écraser l'URL de provision
    // ── NTP / Time / Language ─────────────────────────────────────────────
    ["P213", "1440"],                             // Intervalle sync (min) - selon firmware
    ["P64", "-5"],                                // Timezone offset (EST)
    ["P75", "0"],    // Allow DHCP Option 2 override timezone: No
    ["P246", yesNo(Boolean(context.sipUsername))],
    ["P314", "1"],   // Date format: yyyy-mm-dd
    ["P315", "0"],   // Time format: 12h
    ["P1305", "1"],  // Show Date and Time
    // Language
    ["P331", context.client.defaultLanguage === "fr" ? "fr" : "en"],
    ["P1351", "1"],  // Auto language download
    // ── Call features (global) ────────────────────────────────────────────
    ["P52", "1"],    // Enable Call Waiting
    ["P53", "1"],    // Enable Call Waiting Tone
    ["P54", "1"],    // Escape # as %23 in SIP URI
    ["P55", "1"],    // Enable Transfer
    ["P56", "1"],    // Enable Conference
    ["P102", "30"],  // Off-hook Timeout (s)
    ["P109", "0"],   // Record Mode
    ["P110", "0"],   // Use Quick IP Call Mode
    // General Settings
    ["P1390", "20"], // Keep-Alive Interval (s)
    ["P1391", "5004"],// Local RTP Port
    ["P1392", "200"],// Local RTP Port Range
    ["P1393", "1"],  // Enable In-call DTMF Display
    ["P1394", "0"],  // Use Random Port
    // Ring Tone
    ["P1500", "0"],  // Lock Volume
    ["P1501", "5"],  // Notification Tone Volume
    // LDAP defaults
    ["P1600", "389"],// LDAP Port
    ["P1601", "3"],  // LDAP Version: version3
    ["P1602", "50"], // LDAP Max Hits
    ["P1603", "30"], // LDAP Search Timeout
    ["P1604", "0"],  // LDAP Sort Results
    ["P1605", "0"],  // LDAP Lookup Incoming Calls
    ["P1606", "0"],  // LDAP Lookup Outgoing Calls
    // Settings > Call Features
    ["P1400", "1"],  // Enable Incoming Call Popup
    ["P1401", "0"],  // Allow Incoming Call before Ringing
    ["P1402", "0"],  // Enable Auto Redial
    ["P1403", "20"], // Auto Redial Interval (s)
    ["P1404", "10"], // Auto Redial Times
    ["P1405", "1"],  // Enable Busy Tone on Remote Disconnect
    ["P1407", "0"],  // Enable Direct IP Call
    ["P1408", "1"],  // Enable DND Feature
    ["P1410", "0"],  // Enable Missed Call Notification
    ["P1411", "0"],  // Hide BLF Remote Status
    ["P1412", "0"],  // Ring for Call Waiting
    ["P1413", "0"],  // Show SIP Error Response
    ["P1414", "1"],  // Onhook Dial Barging
    ["P1415", "1"],  // Predictive Dialing Feature
    ["P1418", "10"], // Instant Message Popup Timeout During Call (s)
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
    ["P1362", "1"],  // Key mode: 0=LineMode, 1=AccountMode (1 needed for programmable keys)
    ["P1363", "1"],  // Show keys label
    ["P1364", "0"],  // Show Label Background
    ["P1365", "0"],  // Use Long Label
    ["P1366", "0"],  // Show VPK Icon
    ["P1367", "0"],  // Enable Transfer via Non-Transfer Programmable Keys
    ["P1368", "1"],  // More Softkey Display Mode: 1=Menu
    ["P1369", "1"],  // Custom Call Screen Softkey Layout
    ["P1370", "0"],  // Enforce Softkey Layout Position
    ["P1371", "0"],  // Show Target Softkey
    ["P1464", "**"], // BLF call-pickup prefix

    // P192 ci-dessus gère déjà le firmware - P232 retiré (doublon)
  ] as Array<[string, string]>;
}

function buildSnomBaseEntries(context: PhoneProvisioningContext): Record<string, string> {
  const timezone = context.site?.timezone || context.client.timezone || "America/Toronto";
  const baseUrl = getProvisioningBaseUrl();
  const firmwareBaseUrl = getFirmwareBaseUrl();
  const firmwareUrl = context.firmwareTarget
    ? `${baseUrl}/api/firmware/${context.firmwareTarget.storageKey}`
    : null;

  const entries: Record<string, string> = {
    // ── SIP Account 1 ─────────────────────────────────────────────────
    "user_name":        context.sipUsername || "",
    "user_realname":    context.label || context.sipUsername || "",
    "user_pname":       context.sipUsername || "",
    "user_pass":        context.sipPassword || "",
    "registrar":        context.sipServer || "",
    "proxy":            context.sipServer || "",
    "outbound_proxy":   context.sipServer || "",

    // ── SIP General ───────────────────────────────────────────────────
    "sip_port":         "5060",
    "sip_transport":    "0",     // 0=UDP, 1=TCP, 2=TLS
    "user_dtmf_info":  "0",     // 0=RFC2833, 1=Info, 2=Inband
    "user_regjitter":  "0",
    "user_sipauth":    "0",     // 0=Standard digest
    "user_expire":     "3600",

    // ── Security ──────────────────────────────────────────────────────
    "admin_mode_pw":   context.adminPassword || "admin",

    // ── Codecs ────────────────────────────────────────────────────────
    "user_codec1":     "2",     // 2=G.711u
    "user_codec2":     "3",     // 3=G.711a
    "user_codec3":     "9",     // 9=G.722
    "user_codec4":     "4",     // 4=G.729
    "user_codec5":     "0",
    "user_codec6":     "0",

    // ── DTMF ──────────────────────────────────────────────────────────
    "dtmf_type":        "2",    // 2=RFC2833
    "dtmf_ontime":      "100",
    "dtmf_pause":       "100",

    // ── Call Features ─────────────────────────────────────────────────
    "call_waiting":         "on",
    "transfer_on_hangup":   "off",
    "auto_answer":          "off",
    "mwi_notification":     "on",
    "user_moh":             "on",
    "missed_call_indication": "on",
    "hold_music":           "on",

    // ── NTP / Time ────────────────────────────────────────────────────
    "ntp_server":      "pool.ntp.org",
    "timezone":        snomTimezone(timezone),
    "time_24":         "on",
    "date_format":     "1",     // 1=DD/MM/YYYY

    // ── Language / Display ────────────────────────────────────────────
    "language":        context.client.defaultLanguage === "fr" ? "French" : "English",
    "display_method":  "0",

    // ── Network / VLAN ────────────────────────────────────────────────
    "vlan_enable":     "off",
    "qos_enable":      "on",
    "dscp_voice":      "46",
    "dscp_signal":     "26",

    // ── Provisioning ──────────────────────────────────────────────────
    "setting_server":  `${baseUrl}/api/provisioning/snom/`,
    "update_policy":   "1",     // 1=Check on registration

    // ── Firmware ──────────────────────────────────────────────────────
    ...(firmwareBaseUrl ? { "firmware_status": firmwareBaseUrl } : firmwareUrl ? { "firmware_status": firmwareUrl } : {}),

    // ── Web UI ────────────────────────────────────────────────────────
    "http_user":       "user",
    "http_pass":       context.webPassword || "user",
    "admin_mode":      "on",
  };

  return entries;
}

function snomTimezone(tz: string): string {
  const map: Record<string, string> = {
    "America/Toronto": "CAN-America/Toronto",
    "America/Montreal": "CAN-America/Montreal",
    "America/New_York": "USA-America/New_York",
    "America/Chicago": "USA-America/Chicago",
    "America/Denver": "USA-America/Denver",
    "America/Los_Angeles": "USA-America/Los_Angeles",
    "America/Vancouver": "CAN-America/Vancouver",
    "Europe/Paris": "EUR-Europe/Paris",
    "Europe/London": "EUR-Europe/London",
  };
  return map[tz] ?? "CAN-America/Toronto";
}

function buildSipAccountEntries(vendor: SupportedVendor, context: PhoneProvisioningContext): Array<[string, string]> {
  const extras = (context.sipAccounts ?? []).filter(a => a.enabled && a.accountIndex >= 2);
  if (extras.length === 0) return [];

  const entries: Array<[string, string]> = [];

  for (const acc of extras) {
    const i = acc.accountIndex;
    if (vendor === "yealink") {
      const accSip = splitHostPort(acc.sipServer);
      entries.push([`account.${i}.enable`, "1"]);
      entries.push([`account.${i}.label`, acc.label || acc.sipUsername || `Account ${i}`]);
      entries.push([`account.${i}.display_name`, acc.displayName || acc.label || acc.sipUsername || ""]);
      entries.push([`account.${i}.user_name`, acc.sipUsername || ""]);
      entries.push([`account.${i}.auth_name`, acc.sipUsername || ""]);
      entries.push([`account.${i}.password`, acc.sipPassword || ""]);
      entries.push([`account.${i}.sip_server.1.address`, accSip.host]);
      entries.push([`account.${i}.sip_server.1.port`, accSip.port]);
    } else if (vendor === "grandstream") {
      // Comptes 2+ : décalages P à documenter par modèle ; l'ancien offset écrasait P102 etc.
      continue;
    } else if (vendor === "snom") {
      entries.push([`user_name${i}`, acc.sipUsername || ""]);
      entries.push([`user_pass${i}`, acc.sipPassword || ""]);
      entries.push([`registrar${i}`, acc.sipServer || ""]);
      entries.push([`user_realname${i}`, acc.displayName || acc.label || ""]);
    }
  }

  return entries;
}

function buildProgrammableKeyEntries(vendor: SupportedVendor, context: PhoneProvisioningContext): Array<[string, string]> {
  const keys = context.programmableKeys ?? [];
  if (keys.length === 0) return [];

  const entries: Array<[string, string]> = [];

  if (vendor === "yealink") {
    const physicalCapacity = context.phoneModel.lineCapacity ?? 0;
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

    // Construire un map keyIndex → key pour accès rapide
    const keyMap = new Map(keys.map(k => [k.keyIndex, k]));

    // Toujours écrire TOUTES les touches (jusqu'à lineCapacity) pour écraser les réglages manuels
    const totalKeys = Math.max(physicalCapacity, keys.length > 0 ? Math.max(...keys.map(k => k.keyIndex)) : 0);
    for (let idx = 1; idx <= totalKeys; idx++) {
      const key = keyMap.get(idx);
      if (key && key.mode !== "DEFAULT" && key.mode !== "NONE") {
        const typeCode = modeMap[key.mode] ?? "0";
        const val = key.value ?? "";
        entries.push([`linekey.${idx}.type`, typeCode]);
        entries.push([`linekey.${idx}.line`, "1"]);
        entries.push([`linekey.${idx}.value`, val]);
        entries.push([`linekey.${idx}.label`, key.description ?? ""]);
        if (key.mode === "BLF") {
          entries.push([`linekey.${idx}.extension`, val]);
          entries.push([`linekey.${idx}.pickup_code`, "**"]);
        }
        if (key.locked) entries.push([`linekey.${idx}.locked`, "1"]);
      } else {
        // Touche non configurée → forcer reset à Line (type=0 = N/A serait idéal mais
        // Yealink T33G garde au moins une ligne SIP active sur linekey 1)
        entries.push([`linekey.${idx}.type`, idx === 1 ? "15" : "0"]); // 15=Line pour key1, 0=N/A pour les autres
        entries.push([`linekey.${idx}.value`, ""]);
        entries.push([`linekey.${idx}.label`, ""]);
        entries.push([`linekey.${idx}.line`, "1"]);
      }
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
      CALL_PARK: "11",      // Grandstream: 11 = Call Park
      INTERCOM: "8",
      FORWARD: "4",        // Grandstream: 4 = Forward
      DND: "9",           // Grandstream: 9 = DND
      RECORD: "7",        // Grandstream: 7 = Record
      DEFAULT: "0",
      NONE: "0",
    };

    for (const key of keys) {
      const idx = key.keyIndex - 1; // 0-indexed
      const typeCode = modeMap[key.mode] ?? "0";

      const acct = grandstreamAccountIndexFromUi(key.account);
      if (hasVmpk && key.keyIndex > physicalCapacity) {
        // VMPK (Virtual MPK) - P1400-based, 0-indexed global
        const vIdx = idx; // keyIndex - 1
        entries.push([`P${1400 + vIdx * 4}`, typeCode]);          // VMPK mode
        entries.push([`P${1401 + vIdx * 4}`, acct]);               // account (1-6)
        entries.push([`P${1402 + vIdx * 4}`, key.value ?? ""]);    // value
        entries.push([`P${1403 + vIdx * 4}`, key.description ?? ""]); // label
      } else {
        // MPK physique - P323-based
        // Grandstream: P323 = MPK 1, P327 = MPK 2, P331 = MPK 3, P335 = MPK 4, etc.
        // idx = keyIndex - 1 (0-indexed)
        entries.push([`P${323 + idx * 4}`, typeCode]);
        entries.push([`P${324 + idx * 4}`, acct]);
        entries.push([`P${325 + idx * 4}`, key.value ?? ""]);
        entries.push([`P${326 + idx * 4}`, key.description ?? ""]);
      }
    }
  }

  return entries;
}

export function renderGrandstreamXml(
  context: PhoneProvisioningContext,
  resolvedEntries: ResolvedRuleEntry[] = []
): string {
  const normalizedMac = normalizeMac(context.macAddress);
  const mergedRules = new Map<string, string>();

  for (const [key, value] of buildBaseEntries("grandstream", context)) {
    mergedRules.set(key, value);
  }
  for (const [key, value] of buildSipAccountEntries("grandstream", context)) {
    mergedRules.set(key, value);
  }
  for (const [key, value] of buildProgrammableKeyEntries("grandstream", context)) {
    mergedRules.set(key, value);
  }
  for (const entry of resolvedEntries) {
    mergedRules.set(entry.key, entry.value);
  }

  const escape = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const items = Array.from(mergedRules.entries())
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `  <${k}>${escape(v)}</${k}>`)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" ?>`,
    `<gs_provision version="1">`,
    `<config version="1">`,
    items,
    `</config>`,
    `</gs_provision>`,
  ].join("\n");
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

  // Inject additional SIP accounts (account 2+)
  for (const [key, value] of buildSipAccountEntries(vendor, context)) {
    mergedRules.set(key, value);
  }

  // Inject programmable key entries (can be overridden by explicit rules)
  for (const [key, value] of buildProgrammableKeyEntries(vendor, context)) {
    mergedRules.set(key, value);
  }

  // Clés protégées : les règles PHONE ne peuvent pas écraser les touches programmables
  // ni le key_mode (qui doit rester AccountMode=1 pour que BLF/SpeedDial fonctionnent)
  const protectedPrefixes = vendor === "yealink"
    ? ["linekey.key_mode"]
    : vendor === "grandstream"
    ? ["P1362", "P323", "P324", "P325", "P326", "P1400", "P1401", "P1402", "P1403"]
    : [];

  for (const entry of resolvedEntries) {
    if (protectedPrefixes.some(p => entry.key === p)) continue;

    // Correction automatique des règles problématiques pour Grandstream
    if (vendor === "grandstream") {
      // P212 doit être 1 (HTTP) ou 2 (HTTPS), pas une URL NTP
      // Pour toute règle avec une mauvaise valeur, on la remplace par la bonne valeur
      if (entry.key === "P212" && (entry.value === "pool.ntp.org" || entry.value.includes("ntp"))) {
        // Toujours remplacer par la bonne valeur, peu importe la source
        const baseUrl = getProvisioningBaseUrl();
        mergedRules.set(entry.key, grandstreamUpgradeViaCode(baseUrl));
        continue;
      }

      // P1362 doit être 1 (AccountMode) pour les touches programmables
      // Ignorer les règles DEFAULT/MODEL/CLIENT qui forcent LineMode (0)
      if (entry.key === "P1362" && entry.value === "0") {
        if (entry.source === "DEFAULT" || entry.source === "MODEL" || entry.source === "CLIENT") {
          continue; // Ignorer cette mauvaise règle
        }
        mergedRules.set(entry.key, "1");
        continue;
      }

      // Correction des modes de touches incorrects (valeurs Yealink -> Grandstream)
      const keyIndexMatch = entry.key.match(/^P(\d+)$/);
      if (keyIndexMatch) {
        const keyNum = parseInt(keyIndexMatch[1], 10);
        // P323, P327, P331, P335, P339, etc. (modes de touches MPK)
        if (keyNum >= 323 && keyNum <= 518 && (keyNum - 323) % 4 === 0) {
          // C'est un paramètre de mode (P323, P327, P331, etc.)
          const wrongModes: Record<string, string> = {
            "58": "11",  // CALL_PARK Yealink -> Grandstream
            "7": "4",    // FORWARD Yealink -> Grandstream
            "10": "9",   // DND Yealink -> Grandstream
            "17": "7"    // RECORD Yealink -> Grandstream
          };

          if (entry.value in wrongModes) {
            // Si c'est une règle DEFAULT/MODEL/CLIENT avec une valeur Yealink, on l'ignore
            if (entry.source === "DEFAULT" || entry.source === "MODEL" || entry.source === "CLIENT") {
              continue; // Ignorer cette mauvaise règle
            }
            // Pour PHONE/SITE, on la corrige
            mergedRules.set(entry.key, wrongModes[entry.value]!);
            continue;
          }
        }
      }
    }

    mergedRules.set(entry.key, entry.value);
  }

  if (vendor === "yealink") {
    normalizeYealinkSipServerAddresses(mergedRules);
  }

  // Snom uses XML format
  if (vendor === "snom") {
    const snomBase = buildSnomBaseEntries(context);
    const snomMerged: Record<string, string> = { ...snomBase };
    // Apply resolved rules as overrides
    for (const entry of resolvedEntries) {
      snomMerged[entry.key] = entry.value;
    }
    const lines = Object.entries(snomMerged)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => `  <${k}>${v}</${k}>`);
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<!-- Auto-generated for ${normalizedMac} | ${context.phoneModel.displayName} -->`,
      `<settings>`,
      ...lines,
      `</settings>`,
    ].join("\n");
  }

  const header =
    vendor === "yealink"
      ? ["#!version:1.0.0.1", `## Auto-generated for ${normalizedMac}`, `## Model ${context.phoneModel.displayName}`]
      : ["# Grandstream generated configuration", `# Auto-generated for ${normalizedMac}`, `# Model ${context.phoneModel.displayName}`];

  // Yealink : les valeurs linekey.*.label peuvent avoir des espaces mais ne doivent pas être entre guillemets
  const body = Array.from(mergedRules.entries()).map(([key, value]) => {
    if (vendor === "yealink" && key.startsWith("linekey.")) return `${key} = ${value}`;
    return `${key} = ${formatValue(value)}`;
  });

  return [...header, ...body].join("\n");
}
