import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? session.clientId;

  const templates = await db.phoneTemplate.findMany({
    where: clientId ? { clientId } : {},
    include: {
      rules: { orderBy: { sortOrder: "asc" } },
      _count: { select: { sites: true, phones: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, templates });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  const body = await request.json() as {
    name: string;
    description?: string;
    vendor?: string;
    clientId?: string;
    rules?: { key: string; value: string }[];
  };

  const clientId = body.clientId ?? session.clientId;

  const template = await db.phoneTemplate.create({
    data: {
      clientId: clientId ?? undefined,
      name: body.name,
      description: body.description ?? null,
      vendor: (body.vendor as "YEALINK" | "GRANDSTREAM" | null) ?? null,
      rules: body.rules ? {
        create: body.rules.map((r, i) => ({ key: r.key, value: r.value, sortOrder: i })),
      } : undefined,
    },
    include: { rules: true },
  });

  return NextResponse.json({ ok: true, template });
}
