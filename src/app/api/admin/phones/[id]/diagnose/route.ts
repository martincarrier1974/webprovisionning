import { exec } from "node:child_process";
import * as dgram from "node:dgram";
import * as net from "node:net";
import { promisify } from "node:util";

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const execAsync = promisify(exec);

function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9.\-:]/g, "");
}

async function checkPort(host: string, port: number, timeoutMs = 3000): Promise<{ open: boolean; latencyMs: number | null }> {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      socket.destroy();
      resolve({ open: true, latencyMs: Date.now() - start });
    });
    socket.on("error", () => { socket.destroy(); resolve({ open: false, latencyMs: null }); });
    socket.on("timeout", () => { socket.destroy(); resolve({ open: false, latencyMs: null }); });
    socket.connect(port, host);
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/diagnose">
) {
  await requireAdmin();
  const { id } = await context.params;
  const { action } = await request.json() as { action: string };

  const phone = await db.phone.findUnique({
    where: { id },
    select: {
      macAddress: true, ipAddress: true, sipServer: true,
      sipPort: true, sipUsername: true,
      phoneModel: { select: { vendor: true } },
    },
  });

  if (!phone) return NextResponse.json({ ok: false, error: "Introuvable." }, { status: 404 });

  // ── Ping ──────────────────────────────────────────────────────────────
  if (action === "ping") {
    const target = sanitize(phone.ipAddress || phone.sipServer || "");
    if (!target) return NextResponse.json({ ok: false, error: "Adresse IP ou serveur SIP requis." });
    try {
      const { stdout, stderr } = await execAsync(`ping -c 4 -W 2 ${target}`, { timeout: 15000 });
      return NextResponse.json({ ok: true, output: stdout || stderr });
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string };
      return NextResponse.json({ ok: true, output: err.stdout || err.stderr || "Hôte inaccessible." });
    }
  }

  // ── Traceroute ────────────────────────────────────────────────────────
  if (action === "traceroute") {
    const target = sanitize(phone.ipAddress || phone.sipServer || "");
    if (!target) return NextResponse.json({ ok: false, error: "Adresse IP ou serveur SIP requis." });
    try {
      const { stdout, stderr } = await execAsync(`traceroute -m 15 -w 2 ${target}`, { timeout: 30000 });
      return NextResponse.json({ ok: true, output: stdout || stderr });
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string };
      return NextResponse.json({ ok: true, output: err.stdout || err.stderr || "Traceroute échoué." });
    }
  }

  // ── Port check ────────────────────────────────────────────────────────
  if (action === "port-check") {
    const results: { port: number; label: string; open: boolean; latencyMs: number | null }[] = [];
    const host = sanitize(phone.ipAddress || phone.sipServer || "");
    if (!host) return NextResponse.json({ ok: false, error: "Adresse IP ou serveur SIP requis." });

    const ports = [
      { port: phone.sipPort || 5060, label: "SIP UDP/TCP" },
      { port: 5061, label: "SIP TLS" },
      { port: 80,   label: "HTTP (web UI)" },
      { port: 443,  label: "HTTPS (web UI)" },
    ];

    for (const p of ports) {
      const result = await checkPort(host, p.port);
      results.push({ ...p, ...result });
    }

    return NextResponse.json({ ok: true, results });
  }

  // ── SIP OPTIONS ping ──────────────────────────────────────────────────
  if (action === "sip-options") {
    const host = sanitize(phone.sipServer || "");
    const port = phone.sipPort || 5060;
    if (!host) return NextResponse.json({ ok: false, error: "Serveur SIP requis." });

    const callId = Math.random().toString(36).slice(2);
    const msg = [
      `OPTIONS sip:${phone.sipUsername || "probe"}@${host} SIP/2.0`,
      `Via: SIP/2.0/UDP ${host};branch=z9hG4bK${callId}`,
      `From: <sip:webprov@${host}>;tag=${callId}`,
      `To: <sip:${phone.sipUsername || "probe"}@${host}>`,
      `Call-ID: ${callId}@webprov`,
      `CSeq: 1 OPTIONS`,
      `Contact: <sip:webprov@${host}>`,
      `Content-Length: 0`,
      ``,
      ``,
    ].join("\r\n");

    const sipResult = await new Promise<NextResponse>((resolve) => {
      const socket = dgram.createSocket("udp4");
      let responded = false;

      socket.on("message", (buf: Buffer) => {
        responded = true;
        socket.close();
        const resp = buf.toString();
        const statusLine = resp.split("\r\n")[0] || resp.split("\n")[0];
        resolve(NextResponse.json({ ok: true, output: `Réponse SIP reçue :\n${statusLine}\n\n${resp}` }));
      });

      socket.send(msg, port, host, () => {
        setTimeout(() => {
          if (!responded) {
            socket.close();
            resolve(NextResponse.json({ ok: true, output: `Aucune réponse SIP OPTIONS de ${host}:${port} (timeout 3s). Le serveur est peut-être filtré ou en UDP only.` }));
          }
        }, 3000);
      });
    });
    return sipResult;
  }

  // ── DNS lookup ────────────────────────────────────────────────────────
  if (action === "dns") {
    const target = sanitize(phone.sipServer || "");
    if (!target) return NextResponse.json({ ok: false, error: "Serveur SIP requis." });
    try {
      const { stdout } = await execAsync(`nslookup ${target}`, { timeout: 8000 });
      return NextResponse.json({ ok: true, output: stdout });
    } catch (e: unknown) {
      const err = e as { stdout?: string };
      return NextResponse.json({ ok: true, output: err.stdout || "DNS lookup échoué." });
    }
  }

  return NextResponse.json({ ok: false, error: "Action inconnue." }, { status: 400 });
}
