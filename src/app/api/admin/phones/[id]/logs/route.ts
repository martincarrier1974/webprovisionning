import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/logs">
) {
  await requireAdmin();
  const { id } = await context.params;

  const logs = await db.provisionLog.findMany({
    where: { phoneId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      success: true,
      statusCode: true,
      message: true,
      requestPath: true,
    },
  });

  return NextResponse.json({ ok: true, logs });
}
