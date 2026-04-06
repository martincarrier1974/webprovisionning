import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Some devices probe the base URL before requesting the actual MAC-specific file.
  const url = new URL(request.url);
  const hint = `${url.origin}/api/provisioning/snom/<MAC>`;

  return new NextResponse(`# snom provisioning base\n# use: ${hint}\n`, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "x-provisioning-vendor": "snom" },
  });
}

