/**
 * SIP NOTIFY pour forcer re-provisioning ou reboot à distance
 * Fonctionne via le SIP server (NAT-friendly) ou directement vers l'IP du téléphone
 *
 * RFC 3265 + draft-ietf-sipping-config-framework
 * - Event: check-sync        → téléphone re-pull sa config (Grandstream, Yealink, Snom)
 * - Event: check-sync;reboot → reboot forcé (Grandstream)
 * - Event: reboot            → reboot (Yealink, Snom)
 */

import * as dgram from "node:dgram";
import * as crypto from "node:crypto";

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
}): string {
  const { targetHost, targetPort, sipUsername, sipDomain, event, callId, localIp } = opts;
  const branch = "z9hG4bK" + crypto.randomBytes(6).toString("hex");
  const tag = crypto.randomBytes(4).toString("hex");

  // Grandstream attend "check-sync;reboot=false" ou "check-sync;reboot=true"
  // Yealink et Snom acceptent "check-sync" et "reboot"
  const eventHeader = event === "reboot" ? "check-sync;reboot=true" : "check-sync;reboot=false";

  return [
    `NOTIFY sip:${sipUsername}@${sipDomain} SIP/2.0`,
    `Via: SIP/2.0/UDP ${localIp}:5060;branch=${branch}`,
    `Max-Forwards: 70`,
    `From: <sip:webprovisionning@${sipDomain}>;tag=${tag}`,
    `To: <sip:${sipUsername}@${sipDomain}>`,
    `Call-ID: ${callId}@webprov`,
    `CSeq: 1 NOTIFY`,
    `Contact: <sip:webprovisionning@${localIp}:5060>`,
    `Event: ${eventHeader}`,
    `Subscription-State: active`,
    `Content-Length: 0`,
    ``,
    ``,
  ].join("\r\n");
}

async function sendSipUdp(
  message: string,
  targetHost: string,
  targetPort: number,
  timeoutMs: number,
): Promise<{ ok: boolean; response?: string; error?: string }> {
  return new Promise(resolve => {
    const socket = dgram.createSocket("udp4");
    let done = false;

    const finish = (result: { ok: boolean; response?: string; error?: string }) => {
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
      const statusLine = resp.split("\r\n")[0] || resp.split("\n")[0];
      // 200 OK ou 481 (pas d'abonnement — normal pour NOTIFY sans subscription préalable)
      const status = parseInt(statusLine.split(" ")[1] ?? "0", 10);
      finish({
        ok: status >= 200 && status < 500,
        response: statusLine,
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
    sipPassword: _sipPassword,
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

  const message = buildSipNotifyMessage({
    targetHost: targets[0].host,
    targetPort: targets[0].port,
    sipUsername,
    sipDomain,
    event,
    callId,
    localIp,
  });

  // Essai sur chaque cible
  for (const target of targets) {
    const result = await sendSipUdp(message, target.host, target.port, timeoutMs);
    if (result.ok) {
      return {
        ok: true,
        method: `SIP NOTIFY UDP → ${target.label}`,
        message: `${event === "reboot" ? "Reboot" : "Re-provisioning"} demandé — réponse: ${result.response ?? "OK"}`,
      };
    }
    // Si timeout sur le SIP server, essayer le suivant
  }

  // Aucune cible n'a répondu positivement — on retourne quand même ok=true car
  // certains SIP servers ne répondent pas au NOTIFY mais le transmettent quand même
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
