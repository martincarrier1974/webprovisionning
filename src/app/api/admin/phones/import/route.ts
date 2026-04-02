import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { importPhonesCsv } from "@/lib/csv/import-phones";

export async function POST(request: NextRequest) {
  await requireAdmin();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "Fichier CSV requis." }, { status: 400 });
  }

  const text = await (file as File).text();

  if (!text.trim()) {
    return NextResponse.json({ ok: false, error: "Fichier vide." }, { status: 400 });
  }

  const result = await importPhonesCsv(text);

  return NextResponse.json({ ok: true, data: result });
}
