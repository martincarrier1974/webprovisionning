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

  for (const rule of rules) {
    if (!rule.key) continue;
    await db.provisioningRule.upsert({
      where: {
        // use a composite workaround — find first then upsert
        id: (await db.provisioningRule.findFirst({ where: { phoneId: id, key: rule.key, source: "PHONE" } }))?.id ?? "new",
      },
      create: {
        source: "PHONE",
        phoneId: id,
        key: rule.key,
        value: rule.value,
        sortOrder: 100,
      },
      update: { value: rule.value },
    });
  }

  return NextResponse.json({ ok: true });
}
