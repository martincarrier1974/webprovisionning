import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { exportPhonesCsv } from "@/lib/csv/phones";

export async function GET() {
  await requireAdmin();

  const csv = await exportPhonesCsv();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="phones-export.csv"',
    },
  });
}
