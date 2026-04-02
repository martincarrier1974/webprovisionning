import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

// Assigner / remplacer le template d'un téléphone
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/template">
) {
  await requireAdmin();
  const { id } = await context.params;
  const { templateId } = await request.json() as { templateId: string | null };

  // Supprimer les assignations existantes
  await db.phoneTemplateAssign.deleteMany({ where: { phoneId: id } });

  if (templateId) {
    await db.phoneTemplateAssign.create({
      data: { phoneId: id, templateId, sortOrder: 0 },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/template">
) {
  await requireAdmin();
  const { id } = await context.params;

  const assign = await db.phoneTemplateAssign.findFirst({
    where: { phoneId: id },
    include: { template: { include: { rules: { orderBy: { sortOrder: "asc" } } } } },
  });

  return NextResponse.json({ ok: true, template: assign?.template ?? null });
}
