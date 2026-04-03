import { exec } from "node:child_process";
import { promisify } from "node:util";

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const execAsync = promisify(exec);

// Tries to find phone IP from MAC via ARP table and common discovery methods
async function discoverPhoneIp(mac: string): Promise<string | null> {
  const normalizedMac = mac.toLowerCase().replace(/:/g, "");

  // Method 1: ARP table scan
  try {
    const { stdout } = await execAsync("arp -a 2>/dev/null || ip neigh show 2>/dev/null", { timeout: 5000 });
    const lines = stdout.split("\n");
    for (const line of lines) {
      const cleanLine = line.toLowerCase().replace(/[:-]/g, "");
      if (cleanLine.includes(normalizedMac)) {
        // Extract IP from arp -a output: "hostname (IP) at MAC"
        const ipMatch = line.match(/\((\d+\.\d+\.\d+\.\d+)\)/) ||
                        line.match(/^(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) return ipMatch[1];
      }
    }
  } catch { /* ignore */ }

  // Method 2: nmap ARP ping on common subnets (if available)
  try {
    const { stdout } = await execAsync(
      `nmap -sn --host-timeout 3s -oG - $(ip route | grep 'scope link' | awk '{print $1}' | head -3 | tr '\n' ' ') 2>/dev/null | grep -i "${mac.toLowerCase()}" | awk '{print $2}'`,
      { timeout: 20000 }
    );
    const ip = stdout.trim().split("\n")[0];
    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
  } catch { /* ignore */ }

  return null;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/discover-ip">
) {
  await requireAdmin();
  const { id } = await context.params;

  const phone = await db.phone.findUnique({
    where: { id },
    select: { macAddress: true, ipAddress: true },
  });

  if (!phone) return NextResponse.json({ ok: false, error: "Introuvable." }, { status: 404 });

  const discovered = await discoverPhoneIp(phone.macAddress);

  if (discovered) {
    await db.phone.update({ where: { id }, data: { ipAddress: discovered } });
    return NextResponse.json({ ok: true, ip: discovered, updated: true });
  }

  return NextResponse.json({ ok: false, ip: null, error: "IP non trouvée. Vérifiez que le téléphone est sur le même réseau que le serveur." });
}
