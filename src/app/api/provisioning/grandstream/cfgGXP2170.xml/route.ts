import { NextResponse } from "next/server";

// GXP phones may request cfgGXP2170.xml (model-specific config)
export async function GET() {
  const content = `<?xml version="1.0" encoding="UTF-8" ?>
<gs_provision version="1">
<config version="1">
<!-- Model-specific config for GXP2170 (empty by default) -->
</config>
</gs_provision>`;
    
  return new NextResponse(content, {
    status: 200,
    headers: { 
      "content-type": "application/xml; charset=utf-8",
      "x-provisioning-vendor": "grandstream",
      "x-model-specific": "GXP2170"
    },
  });
}