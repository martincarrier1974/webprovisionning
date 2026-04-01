import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { getObjectStorageSummary } from "@/lib/storage/object-storage";

export async function GET() {
  await requireAdmin();

  return NextResponse.json({
    ok: true,
    data: getObjectStorageSummary(),
  });
}
