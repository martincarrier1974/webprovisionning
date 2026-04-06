import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Some phones may probe the base URL before requesting files.
  // Return 200 text/plain to avoid treating it as a hard failure.
  const url = new URL(request.url);
  const hint = `${url.origin}/api/provisioning/yealink/<MAC>`;

  return new NextResponse(`# yealink provisioning base\n# use: ${hint}\n`, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "x-provisioning-vendor": "yealink" },
  });
}

