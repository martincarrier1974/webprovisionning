import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID de règle manquant" }, { status: 400 });
  }

  try {
    // Vérifier que la règle existe
    const rule = await db.provisioningRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return NextResponse.json({ error: "Règle non trouvée" }, { status: 404 });
    }

    // Supprimer la règle
    await db.provisioningRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression règle:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}