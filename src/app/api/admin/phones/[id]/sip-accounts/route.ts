import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/sip-accounts">
) {
  await requireAdmin();
  const { id } = await context.params;

  const accounts = await db.phoneSipAccount.findMany({
    where: { phoneId: id },
    orderBy: { accountIndex: "asc" },
  });
  return NextResponse.json({ ok: true, accounts });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/sip-accounts">
) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json() as {
    accountIndex: number;
    label?: string;
    sipUsername?: string;
    sipPassword?: string;
    sipServer?: string;
    displayName?: string;
    enabled?: boolean;
  };

  const account = await db.phoneSipAccount.upsert({
    where: { phoneId_accountIndex: { phoneId: id, accountIndex: body.accountIndex } },
    update: {
      label: body.label ?? null,
      sipUsername: body.sipUsername ?? null,
      sipPassword: body.sipPassword ?? null,
      sipServer: body.sipServer ?? null,
      displayName: body.displayName ?? null,
      enabled: body.enabled ?? true,
    },
    create: {
      phoneId: id,
      accountIndex: body.accountIndex,
      label: body.label ?? null,
      sipUsername: body.sipUsername ?? null,
      sipPassword: body.sipPassword ?? null,
      sipServer: body.sipServer ?? null,
      displayName: body.displayName ?? null,
      enabled: body.enabled ?? true,
    },
  });

  return NextResponse.json({ ok: true, account });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/sip-accounts">
) {
  await requireAdmin();
  const { id } = await context.params;
  const { accountIndex } = await request.json() as { accountIndex: number };

  await db.phoneSipAccount.deleteMany({
    where: { phoneId: id, accountIndex },
  });

  return NextResponse.json({ ok: true });
}
