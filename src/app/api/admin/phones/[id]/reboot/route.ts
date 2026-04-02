import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/reboot">
) {
  await requireAdmin();
  const { id } = await context.params;

  const phone = await db.phone.findUnique({
    where: { id },
    include: { phoneModel: { select: { vendor: true } } },
  });

  if (!phone) return NextResponse.json({ ok: false, error: "Téléphone introuvable." }, { status: 404 });

  // Note: reboot requires the phone IP address which is not stored yet.
  // This endpoint is ready for when IP tracking is added.
  // For now, log the intent and return a meaningful response.
  await db.auditLog.create({
    data: {
      action: "phone.reboot.requested",
      entityType: "Phone",
      entityId: id,
      metadata: JSON.stringify({ vendor: phone.phoneModel.vendor, mac: phone.macAddress }),
    },
  });

  return NextResponse.json({
    ok: false,
    error: "Redémarrage à distance nécessite l'adresse IP du téléphone. Fonctionnalité disponible une fois le champ IP ajouté.",
  });
}
