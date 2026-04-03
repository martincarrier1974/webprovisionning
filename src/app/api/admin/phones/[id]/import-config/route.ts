import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { importPhoneConfig, filterSensitiveRules } from "@/lib/phone-control/import-config";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/import-config">
) {
  await requireAdmin();
  const { id } = await context.params;

  const phone = await db.phone.findUnique({
    where: { id },
    select: {
      id: true, macAddress: true, ipAddress: true, adminPassword: true,
      phoneModel: { select: { vendor: true } },
    },
  });

  if (!phone) return NextResponse.json({ ok: false, error: "Introuvable." }, { status: 404 });
  if (!phone.ipAddress) return NextResponse.json({ ok: false, error: "Adresse IP requise. Configurez-la dans l'onglet Diagnostic." });

  const result = await importPhoneConfig(
    phone.phoneModel.vendor,
    phone.ipAddress,
    phone.adminPassword || "admin",
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error });

  const filtered = filterSensitiveRules(result.rules ?? [], phone.phoneModel.vendor);

  return NextResponse.json({ ok: true, rules: filtered, total: result.rules?.length ?? 0 });
}
