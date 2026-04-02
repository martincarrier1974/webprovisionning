import { exec } from "node:child_process";
import { promisify } from "node:util";

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";

const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/ping">
) {
  await requireAdmin();
  const { target } = await request.json();

  if (!target || typeof target !== "string") {
    return NextResponse.json({ ok: false, error: "Cible requise." }, { status: 400 });
  }

  // Sanitize: only allow hostname/IP characters
  const safe = target.replace(/[^a-zA-Z0-9.\-:]/g, "");
  if (!safe) return NextResponse.json({ ok: false, error: "Cible invalide." }, { status: 400 });

  try {
    const { stdout, stderr } = await execAsync(`ping -c 4 -W 3 ${safe}`, { timeout: 15000 });
    return NextResponse.json({ ok: true, output: stdout || stderr });
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json({ ok: true, output: error.stdout || error.stderr || error.message || "Hôte inaccessible." });
  }
}
