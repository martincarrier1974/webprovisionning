import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET() {
  await requireAdmin();

  const rules = await db.provisioningRule.findMany({
    orderBy: [{ source: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      client: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
      phoneModel: { select: { id: true, vendor: true, displayName: true } },
      phone: { select: { id: true, macAddress: true, label: true } },
    },
  });

  return NextResponse.json({ ok: true, data: rules });
}
