import { NextResponse } from "next/server";

import { buildPublicObjectUrl } from "@/lib/storage/object-storage";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/firmware/[...path]">
) {
  const params = await context.params;
  const key = params.path.join("/");
  const publicUrl = buildPublicObjectUrl(key);

  if (!publicUrl) {
    return NextResponse.json(
      { ok: false, error: "Object storage is not configured." },
      { status: 503 }
    );
  }

  return NextResponse.redirect(publicUrl, 307);
}
