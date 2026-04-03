import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/sites/[id]/templates">
) {
  await requireAdmin();
  const { id } = await context.params;
  const { templateId } = await request.json() as { templateId: string };

  await db.siteTemplate.upsert({
    where: { siteId_templateId: { siteId: id, templateId } },
    update: {},
    create: { siteId: id, templateId, sortOrder: 0 },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/admin/sites/[id]/templates">
) {
  await requireAdmin();
  const { id } = await context.params;
  const { templateId } = await request.json() as { templateId: string };

  await db.siteTemplate.deleteMany({ where: { siteId: id, templateId } });

  return NextResponse.json({ ok: true });
}
