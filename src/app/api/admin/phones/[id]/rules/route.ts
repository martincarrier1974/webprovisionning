import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/rules">
) {
  await requireAdmin();
  const { id } = await context.params;
  const { rules } = await request.json() as { rules: { key: string; value: string }[] };

  const phone = await db.phone.findUnique({ where: { id } });
  if (!phone) return NextResponse.json({ ok: false, error: "Téléphone introuvable." }, { status: 404 });

  // Upsert propre : deleteMany + createMany pour éviter les doublons
  // (Prisma n'a pas d'index composite unique sur source+phoneId+key dans ce schéma)
  const keys = rules.map(r => r.key).filter(Boolean);
  if (keys.length > 0) {
    await db.provisioningRule.deleteMany({
      where: { phoneId: id, source: "PHONE", key: { in: keys } },
    });
  }

  const toCreate = rules.filter(r => r.key && r.value !== "");
  if (toCreate.length > 0) {
    await db.provisioningRule.createMany({
      data: toCreate.map((rule, i) => ({
        source: "PHONE" as const,
        phoneId: id,
        key: rule.key,
        value: rule.value,
        sortOrder: 100 + i,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}
