import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET() {
  await requireAdmin();

  const phones = await db.phone.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      phoneModel: {
        select: {
          id: true,
          vendor: true,
          modelCode: true,
          displayName: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, data: phones });
}
