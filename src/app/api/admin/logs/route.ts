import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");

  const logs = await db.provisionLog.findMany({
    where: {
      ...(clientId ? { phone: { clientId } } : {}),
      ...(status === "ok" ? { success: true } : status === "err" ? { success: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      phone: {
        select: {
          id: true,
          label: true,
          macAddress: true,
          client: { select: { name: true } },
          site: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, logs });
}
