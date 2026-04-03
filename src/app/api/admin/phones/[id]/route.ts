import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]">
) {
  await requireAdmin();
  const { id } = await context.params;

  const phone = await db.phone.findUnique({ where: { id }, select: { id: true, macAddress: true } });
  if (!phone) return NextResponse.json({ ok: false, error: "Introuvable." }, { status: 404 });

  await db.phone.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
