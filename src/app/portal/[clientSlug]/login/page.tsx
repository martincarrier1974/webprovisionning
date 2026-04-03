import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

type Props = { params: Promise<{ clientSlug: string }> };

export default async function ClientPortalLoginPage({ params }: Props) {
  const { clientSlug } = await params;

  const client = await db.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, name: true, isActive: true },
  });

  if (!client || !client.isActive) notFound();

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--background)",
    }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
            Web<span style={{ color: "var(--accent)" }}>Prov</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{client.name}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Portail client</div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <PortalLoginForm clientSlug={clientSlug} />
        </div>
      </div>
    </div>
  );
}
