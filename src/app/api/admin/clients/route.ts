import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET() {
  await requireAdmin();

  const clients = await db.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          sites: true,
          phones: true,
          users: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, data: clients });
}
