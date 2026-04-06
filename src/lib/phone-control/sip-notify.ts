/**
 * SIP NOTIFY pour forcer re-provisioning ou reboot à distance
 * Fonctionne via le SIP server (NAT-friendly) ou directement vers l'IP du téléphone
 *
 * RFC 3265 + draft-ietf-sipping-config-framework
 * - Event: check-sync        → téléphone re-pull sa config (Grandstream, Yealink, Snom)
 * - Event: check-sync;reboot → reboot forcé (Grandstream)
 * - Event: reboot            → reboot (Yealink, Snom)
 *
 * Supporte l'authentification Digest SIP (RFC 3261) — challenge 401/407
 */

import * as dgram from "node:dgram";
import * as crypto from "node:crypto";

// ── SIP Digest Auth ────────────────────────────────────────────────────────

function md5(s: string): string {
  return crypto.createHash("md5").update(s).digest("hex");
}

function parseWwwAuthenticate(header: string): { realm: string; nonce: string; algorithm: string; qop?: string } | null {
  const realm  = /realm="([^"]+)"/i.exec(header)?.[1] ?? "";
  const nonce  = /nonce="([^"]+)"/i.exec(header)?.[1] ?? "";
  const algorithm = /algorithm=([^\s,]+)/i.exec(header)?.[1] ?? "MD5";
  const qop    = /qop="?([^",\s]+)"?/i.exec(header)?.[1];
  if (!realm || !nonce) return null;
  return { realm, nonce, algorithm, qop };
}

function buildDigestAuth(opts: {
  username: string;
  password: string;
  method: string;
  uri: string;
  realm: string;
  nonce: string;
  qop?: string;
  nc?: string;
  cnonce?: string;
}): string {
  const { username, password, method, uri, realm, nonce, qop, nc, cnonce } = opts;
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  let response: string;
  if (qop === "auth" && nc && cnonce) {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", algorithm=MD5, qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  }
  response = md5(`${ha1}:${nonce}:${ha2}`);
  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", algorithm=MD5, response="${response}"`;
}

export type SipNotifyResult = {
  ok: boolean;
  method: string;
  message: string;
};

interface SipNotifyOptions {
  vendor: string;
  /** IP du téléphone (direct, si accessible) */
  phoneIp?: string | null;
  /** SIP server host:port (NAT-friendly, préféré) */
  sipServer?: string | null;
  sipUsername?: string | null;
  sipPassword?: string | null;
  /** "check-sync" = reprovision | "reboot" = reboot */
  event: "check-sync" | "reboot";
  timeoutMs?: number;
}

function parseSipServer(raw: string | null | undefined): { host: string; port: number } {
  if (!raw) return { host: "", port: 5060 };
  const trimmed = raw.trim();
  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon > 0) {
    const possiblePort = parseInt(trimmed.slice(lastColon + 1), 10);
    if (!isNaN(possiblePort) && possiblePort > 0 && possiblePort < 65536) {
      return { host: trimmed.slice(0, lastColon), port: possiblePort };
    }
  }
  return { host: trimmed, port: 5060 };
}

function buildSipNotifyMessage(opts: {
  targetHost: string;
  targetPort: number;
  sipUsername: string;
  sipDomain: string;
  event: string;
  callId: string;
  localIp: string;
  cseq?: number;
  authHeader?: string;
}): string {
  const { sipUsername, sipDomain, event, callId, localIp, cseq = 1, authHeader } = opts;
  const branch = "z9hG4bK" + crypto.randomBytes(6).toString("hex");
  const tag = crypto.randomBytes(4).toString("hex");

  const eventHeader = event === "reboot" ? "check-sync;reboot=true" : "check-sync;reboot=false";

  const lines = [
    `NOTIFY sip:${sipUsername}@${sipDomain} SIP/2.0`,
    `Via: SIP/2.0/UDP ${localIp}:5060;branch=${branch}`,
    `Max-Forwards: 70`,
    `From: <sip:webprovisionning@${sipDomain}>;tag=${tag}`,
    `To: <sip:${sipUsername}@${sipDomain}>`,
    `Call-ID: ${callId}@webprov`,
    `CSeq: ${cseq} NOTIFY`,
    `Contact: <sip:webprovisionning@${localIp}:5060>`,
    `Event: ${eventHeader}`,
    `Subscription-State: active`,
  ];

  if (authHeader) lines.push(`Authorization: ${authHeader}`);

  lines.push(`Content-Length: 0`, ``, ``);
  return lines.join("\r\n");
}

async function sendSipUdp(
  message: string,
  targetHost: string,
  targetPort: number,
  timeoutMs: number,
): Promise<{ ok: boolean; status?: number; response?: string; wwwAuthenticate?: string; error?: string }> {
  return new Promise(resolve => {
    const socket = dgram.createSocket("udp4");
    let done = false;

    const finish = (result: { ok: boolean; status?: number; response?: string; wwwAuthenticate?: string; error?: string }) => {
      if (done) return;
      done = true;
      try { socket.close(); } catch { /* ignore */ }
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ ok: false, error: "Timeout — aucune réponse SIP dans le délai imparti." });
    }, timeoutMs);

    socket.on("message", (buf: Buffer) => {
      clearTimeout(timer);
      const resp = buf.toString();
      const lines = resp.split("\r\n");
      const statusLine = lines[0] || "";
      const status = parseInt(statusLine.split(" ")[1] ?? "0", 10);

      // Extraire WWW-Authenticate ou Proxy-Authenticate pour Digest auth
      const wwwAuth = lines.find(l =>
        l.toLowerCase().startsWith("www-authenticate:") ||
        l.toLowerCase().startsWith("proxy-authenticate:")
      )?.replace(/^[^:]+:\s*/i, "");

      // 200 OK, 202, 481 = succès fonctionnel
      // 401/407 = auth required → retourner pour relancer avec credentials
      finish({
        ok: status >= 200 && status < 500 && status !== 401 && status !== 407,
        status,
        response: statusLine,
        wwwAuthenticate: wwwAuth,
      });
    });

    socket.on("error", (err: Error) => {
      clearTimeout(timer);
      finish({ ok: false, error: err.message });
    });

    const buf = Buffer.from(message, "utf8");
    socket.send(buf, 0, buf.length, targetPort, targetHost, (err) => {
      if (err) {
        clearTimeout(timer);
        finish({ ok: false, error: err.message });
      }
    });
  });
}

/**
 * Envoie un SIP NOTIFY check-sync ou reboot au téléphone.
 * Essaie d'abord via le SIP server (NAT-friendly), puis directement vers l'IP.
 */
export async function sendSipNotify(opts: SipNotifyOptions): Promise<SipNotifyResult> {
  const {
    vendor,
    phoneIp,
    sipServer,
    sipUsername,
    sipPassword,
    event,
    timeoutMs = 5000,
  } = opts;

  if (!sipUsername) {
    return { ok: false, method: "SIP NOTIFY", message: "SIP username requis pour envoyer un NOTIFY." };
  }

  const callId = crypto.randomBytes(8).toString("hex");
  // On essaie de déterminer l'IP locale — en production Railway, c'est l'IP du conteneur
  const localIp = "127.0.0.1"; // Le SIP server répondra à l'adresse source du socket UDP

  // Cible : SIP server en priorité (NAT-friendly), sinon IP directe du téléphone
  const targets: { host: string; port: number; label: string }[] = [];

  if (sipServer) {
    const parsed = parseSipServer(sipServer);
    if (parsed.host) targets.push({ ...parsed, label: `SIP server (${parsed.host}:${parsed.port})` });
  }
  if (phoneIp) {
    targets.push({ host: phoneIp, port: 5060, label: `IP directe (${phoneIp})` });
  }

  if (targets.length === 0) {
    return {
      ok: false,
      method: "SIP NOTIFY",
      message: "Ni SIP server ni adresse IP configurés sur ce téléphone.",
    };
  }

  const sipDomain = sipServer ? parseSipServer(sipServer).host : (phoneIp ?? "localhost");

  // Essai sur chaque cible avec support Digest Auth (401/407 challenge)
  for (const target of targets) {
    const sipUri = `sip:${sipUsername}@${sipDomain}`;

    // Première tentative (sans auth)
    const msg1 = buildSipNotifyMessage({
      targetHost: target.host,
      targetPort: target.port,
      sipUsername,
      sipDomain,
      event,
      callId,
      localIp,
      cseq: 1,
    });

    const r1 = await sendSipUdp(msg1, target.host, target.port, timeoutMs);

    if (r1.ok) {
      return {
        ok: true,
        method: `SIP NOTIFY UDP → ${target.label}`,
        message: `${event === "reboot" ? "Reboot" : "Re-provisioning"} demandé — réponse: ${r1.response ?? "OK"}`,
      };
    }

    // 401 ou 407 → Digest challenge
    if ((r1.status === 401 || r1.status === 407) && r1.wwwAuthenticate && sipPassword) {
      const authInfo = parseWwwAuthenticate(r1.wwwAuthenticate);
      if (authInfo) {
        const cnonce = crypto.randomBytes(4).toString("hex");
        const nc = "00000001";
        const authHeader = buildDigestAuth({
          username: sipUsername,
          password: sipPassword,
          method: "NOTIFY",
          uri: sipUri,
          realm: authInfo.realm,
          nonce: authInfo.nonce,
          qop: authInfo.qop,
          nc: authInfo.qop ? nc : undefined,
          cnonce: authInfo.qop ? cnonce : undefined,
        });

        const msg2 = buildSipNotifyMessage({
          targetHost: target.host,
          targetPort: target.port,
          sipUsername,
          sipDomain,
          event,
          callId,
          localIp,
          cseq: 2,
          authHeader,
        });

        const r2 = await sendSipUdp(msg2, target.host, target.port, timeoutMs);
        if (r2.ok) {
          return {
            ok: true,
            method: `SIP NOTIFY UDP + Digest Auth → ${target.label}`,
            message: `${event === "reboot" ? "Reboot" : "Re-provisioning"} demandé — réponse: ${r2.response ?? "OK"}`,
          };
        }
        // Auth échouée (403 mauvais mdp, etc.)
        if (r2.status === 403) {
          return {
            ok: false,
            method: `SIP NOTIFY UDP → ${target.label}`,
            message: `Authentification SIP refusée (403) — vérifier le mot de passe SIP du téléphone.`,
          };
        }
      }
    }

    // Timeout ou autre erreur → essayer la prochaine cible
  }

  const vendorNote = vendor === "GRANDSTREAM"
    ? "Vérifier que P1375 (SIP NOTIFY auth) = 1 sur le téléphone."
    : vendor === "YEALINK"
    ? "Vérifier que auto_provision.notify.enable = 1 sur le téléphone."
    : "";

  return {
    ok: false,
    method: `SIP NOTIFY UDP → ${targets.map(t => t.label).join(", ")}`,
    message: `Aucune réponse SIP reçue. Le téléphone est peut-être derrière NAT ou NOTIFY non activé. ${vendorNote}`.trim(),
  };
}
