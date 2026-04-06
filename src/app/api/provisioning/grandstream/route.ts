import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Some devices probe the base URL before requesting cfg.xml / cfg<MAC>.xml.
  // Return 200 to avoid treating this probe as a hard provisioning failure.
  const url = new URL(request.url);
  const hint = `${url.origin}/api/provisioning/grandstream/<MAC>`;

  return new NextResponse(`# grandstream provisioning base\n# use: ${hint}\n`, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "x-provisioning-vendor": "grandstream" },
  });
}

