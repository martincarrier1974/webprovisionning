import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET() {
  await requireAdmin();

  const firmwares = await db.firmware.findMany({
    orderBy: [{ phoneModel: { vendor: "asc" } }, { phoneModel: { displayName: "asc" } }, { version: "desc" }],
    include: {
      phoneModel: {
        select: {
          id: true,
          vendor: true,
          modelCode: true,
          displayName: true,
        },
      },
      _count: {
        select: {
          phones: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, data: firmwares });
}
