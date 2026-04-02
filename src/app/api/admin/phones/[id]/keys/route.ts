import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/keys">
) {
  await requireAdmin();
  const { id } = await context.params;

  const keys = await db.phoneProgrammableKey.findMany({
    where: { phoneId: id },
    orderBy: { keyIndex: "asc" },
  });

  return NextResponse.json({ ok: true, data: keys });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/keys">
) {
  await requireAdmin();
  const { id } = await context.params;
  const { keys } = await request.json() as {
    enabled: boolean;
    keys: { keyIndex: number; account: string; description: string; mode: string; locked: boolean; value: string }[];
  };

  const phone = await db.phone.findUnique({ where: { id } });
  if (!phone) return NextResponse.json({ ok: false, error: "Téléphone introuvable." }, { status: 404 });

  // Delete existing and recreate (simpler than upsert for bulk)
  await db.phoneProgrammableKey.deleteMany({ where: { phoneId: id } });

  await db.phoneProgrammableKey.createMany({
    data: keys.map(k => ({
      phoneId: id,
      keyIndex: k.keyIndex,
      account: k.account || null,
      description: k.description || null,
      mode: k.mode,
      locked: k.locked,
      value: k.value || null,
    })),
  });

  await db.auditLog.create({
    data: {
      action: "phone.keys.update",
      entityType: "Phone",
      entityId: id,
      metadata: JSON.stringify({ keysCount: keys.length }),
    },
  });

  return NextResponse.json({ ok: true });
}
