import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/admin/templates/[id]">
) {
  await requireAdmin();
  const { id } = await context.params;

  const template = await db.phoneTemplate.findUnique({
    where: { id },
    include: { rules: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return NextResponse.json({ ok: false, error: "Introuvable." }, { status: 404 });

  return NextResponse.json({ ok: true, template });
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/admin/templates/[id]">
) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json() as {
    name?: string;
    description?: string;
    vendor?: string | null;
    rules?: { key: string; value: string }[];
  };

  const template = await db.phoneTemplate.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      vendor: body.vendor as "YEALINK" | "GRANDSTREAM" | null | undefined,
    },
  });

  if (body.rules) {
    await db.phoneTemplateRule.deleteMany({ where: { templateId: id } });
    await db.phoneTemplateRule.createMany({
      data: body.rules.map((r, i) => ({ templateId: id, key: r.key, value: r.value, sortOrder: i })),
    });
  }

  return NextResponse.json({ ok: true, template });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/admin/templates/[id]">
) {
  await requireAdmin();
  const { id } = await context.params;
  await db.phoneTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
