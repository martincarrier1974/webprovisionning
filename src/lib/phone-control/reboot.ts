/**
 * Remote reboot for Grandstream, Yealink, and Snom phones
 * Requires the phone's IP address and web credentials
 */

export type RebootResult = { ok: boolean; method: string; message: string };

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function basicAuth(user: string, pass: string) {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

// ── Grandstream ────────────────────────────────────────────────────────────
// GET http://IP/sys?action=reboot  (with Basic Auth admin:password)
export async function rebootGrandstream(ip: string, adminPassword: string): Promise<RebootResult> {
  const url = `http://${ip}/sys?action=reboot`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: basicAuth("admin", adminPassword) },
    });
    if (res.ok || res.status === 200) {
      return { ok: true, method: "HTTP GET", message: `Reboot envoyé (${res.status})` };
    }
    const body = await res.text();
    return { ok: false, method: "HTTP GET", message: `Erreur ${res.status}: ${body.slice(0, 100)}` };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err.name === "AbortError") return { ok: false, method: "HTTP GET", message: "Timeout — téléphone inaccessible." };
    return { ok: false, method: "HTTP GET", message: err.message ?? "Erreur réseau." };
  }
}

// ── Yealink ────────────────────────────────────────────────────────────────
// POST http://IP/action.uri  body: action=reboot  (with Basic Auth admin:admin)
export async function rebootYealink(ip: string, adminPassword: string): Promise<RebootResult> {
  const url = `http://${ip}/action.uri`;
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        Authorization: basicAuth("admin", adminPassword),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "action=reboot",
    });
    if (res.ok || res.status === 200) {
      return { ok: true, method: "HTTP POST action.uri", message: `Reboot envoyé (${res.status})` };
    }
    // Also try GET variant for older models
    const res2 = await fetchWithTimeout(`http://${ip}/cgi-bin/ConfigManApp.com?key=Reboot`, {
      headers: { Authorization: basicAuth("admin", adminPassword) },
    });
    if (res2.ok) return { ok: true, method: "HTTP GET CGI", message: `Reboot envoyé (${res2.status})` };
    return { ok: false, method: "HTTP POST", message: `Erreur ${res.status}` };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err.name === "AbortError") return { ok: false, method: "HTTP POST", message: "Timeout — téléphone inaccessible." };
    return { ok: false, method: "HTTP POST", message: err.message ?? "Erreur réseau." };
  }
}

// ── Snom ───────────────────────────────────────────────────────────────────
// GET http://IP/command.htm?reboot=reboot  (with Basic Auth)
export async function rebootSnom(ip: string, adminPassword: string): Promise<RebootResult> {
  const url = `http://${ip}/command.htm?reboot=reboot`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: basicAuth("admin", adminPassword) },
    });
    if (res.ok || res.status === 200) {
      return { ok: true, method: "HTTP GET command.htm", message: `Reboot envoyé (${res.status})` };
    }
    return { ok: false, method: "HTTP GET", message: `Erreur ${res.status}` };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err.name === "AbortError") return { ok: false, method: "HTTP GET", message: "Timeout — téléphone inaccessible." };
    return { ok: false, method: "HTTP GET", message: err.message ?? "Erreur réseau." };
  }
}

export async function rebootPhone(vendor: string, ip: string, adminPassword: string): Promise<RebootResult> {
  if (vendor === "GRANDSTREAM") return rebootGrandstream(ip, adminPassword);
  if (vendor === "YEALINK") return rebootYealink(ip, adminPassword);
  if (vendor === "SNOM") return rebootSnom(ip, adminPassword);
  return { ok: false, method: "N/A", message: `Vendor ${vendor} non supporté.` };
}
