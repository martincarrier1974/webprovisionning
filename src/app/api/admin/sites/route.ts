import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET() {
  await requireAdmin();

  const sites = await db.site.findMany({
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
    include: {
      client: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          phones: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, data: sites });
}
