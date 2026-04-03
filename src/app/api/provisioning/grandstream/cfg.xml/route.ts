import { NextResponse } from "next/server";

// GXP phones request cfg.xml (general config) before cfg<MAC>.xml
// Return empty valid XML so the phone continues to the MAC-specific file
export async function GET() {
  const content = `<?xml version="1.0" encoding="UTF-8" ?>\n<gs_provision version="1">\n<config version="1">\n</config>\n</gs_provision>`;
  return new NextResponse(content, {
    status: 200,
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
