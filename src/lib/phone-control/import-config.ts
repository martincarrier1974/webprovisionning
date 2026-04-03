/**
 * Import current phone configuration via HTTP
 * Grandstream: GET /cgi-bin/download-config.cgi
 * Yealink:     GET /servlet?phonecfg=get
 * Snom:        GET /settingsDump.htm
 */

export type ImportedRule = { key: string; value: string; source: string };
export type ImportConfigResult = { ok: boolean; rules?: ImportedRule[]; raw?: string; error?: string };

async function fetchWithAuth(url: string, user: string, pass: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── Grandstream ─────────────────────────────────────────────────────────────
// Returns P-value config: "P1 = value\nP2 = value\n..."
export async function importGrandstream(ip: string, adminPassword: string): Promise<ImportConfigResult> {
  const urls = [
    `http://${ip}/cgi-bin/download-config.cgi`,
    `http://${ip}/cgi-bin/config.cgi?action=export`,
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithAuth(url, "admin", adminPassword);
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim()) continue;

      const rules: ImportedRule[] = [];
      for (const line of text.split("\n")) {
        const match = line.match(/^(P\d+)\s*=\s*(.*)$/);
        if (match) {
          const val = match[2].trim().replace(/^"(.*)"$/, "$1");
          if (val) rules.push({ key: match[1], value: val, source: "grandstream-import" });
        }
      }
      if (rules.length > 0) return { ok: true, rules, raw: text };
    } catch { continue; }
  }

  return { ok: false, error: "Impossible de récupérer la config. Vérifiez l'IP et le mot de passe admin." };
}

// ── Yealink ──────────────────────────────────────────────────────────────────
// Returns key=value config file
export async function importYealink(ip: string, adminPassword: string): Promise<ImportConfigResult> {
  const urls = [
    `http://${ip}/servlet?phonecfg=get`,
    `http://${ip}/download/config.cfg`,
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithAuth(url, "admin", adminPassword);
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim()) continue;

      const rules: ImportedRule[] = [];
      for (const line of text.split("\n")) {
        // Skip comments and version header
        if (line.startsWith("#") || line.startsWith("!") || !line.includes("=")) continue;
        const eqIdx = line.indexOf("=");
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
        if (key && val) rules.push({ key, value: val, source: "yealink-import" });
      }
      if (rules.length > 0) return { ok: true, rules, raw: text };
    } catch { continue; }
  }

  return { ok: false, error: "Impossible de récupérer la config Yealink. Vérifiez l'IP et le mot de passe admin." };
}

// ── Snom ────────────────────────────────────────────────────────────────────
// Returns XML settings dump
export async function importSnom(ip: string, adminPassword: string): Promise<ImportConfigResult> {
  const url = `http://${ip}/settingsDump.htm`;
  try {
    const res = await fetchWithAuth(url, "admin", adminPassword);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = await res.text();

    // Parse XML: <setting_name>value</setting_name>
    const rules: ImportedRule[] = [];
    const re = /<([a-zA-Z_][a-zA-Z0-9_]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const key = m[1];
      const val = m[2].trim();
      if (key && val && key !== "settings") {
        rules.push({ key, value: val, source: "snom-import" });
      }
    }
    if (rules.length > 0) return { ok: true, rules, raw: text };
    return { ok: false, error: "Aucune valeur parsée depuis la config Snom." };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err.name === "AbortError") return { ok: false, error: "Timeout — téléphone inaccessible." };
    return { ok: false, error: err.message ?? "Erreur réseau." };
  }
}

export async function importPhoneConfig(vendor: string, ip: string, adminPassword: string): Promise<ImportConfigResult> {
  if (vendor === "GRANDSTREAM") return importGrandstream(ip, adminPassword);
  if (vendor === "YEALINK") return importYealink(ip, adminPassword);
  if (vendor === "SNOM") return importSnom(ip, adminPassword);
  return { ok: false, error: `Vendor ${vendor} non supporté.` };
}

// Filter out sensitive/irrelevant P-values before showing to user
const SKIP_KEYS_GS = new Set(["P2", "P34", "P35", "P102", "P103"]); // passwords etc.
const SKIP_PREFIXES_YL = ["account.1.password", "account.1.auth_name", "http_passwd"];

export function filterSensitiveRules(rules: ImportedRule[], vendor: string): ImportedRule[] {
  if (vendor === "GRANDSTREAM") {
    return rules.filter(r => !SKIP_KEYS_GS.has(r.key));
  }
  if (vendor === "YEALINK") {
    return rules.filter(r => !SKIP_PREFIXES_YL.some(p => r.key.startsWith(p)));
  }
  return rules;
}
