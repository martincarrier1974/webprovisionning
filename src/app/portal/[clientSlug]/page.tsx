import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { PortalPhoneList } from "@/components/portal/portal-phone-list";

type Props = { params: Promise<{ clientSlug: string }> };

export default async function ClientPortalPage({ params }: Props) {
  const { clientSlug } = await params;

  const client = await db.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, name: true, isActive: true },
  });

  if (!client || !client.isActive) notFound();

  const session = await getSession();
  if (!session) redirect(`/portal/${clientSlug}/login`);

  // Ensure the logged-in user belongs to this client (or is SUPER_ADMIN)
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, clientId: true, firstName: true, email: true },
  });

  if (!user) redirect(`/portal/${clientSlug}/login`);
  if (user.role !== "SUPER_ADMIN" && user.clientId !== client.id) {
    redirect(`/portal/${clientSlug}/login`);
  }

  const phones = await db.phone.findMany({
    where: { clientId: client.id },
    orderBy: [{ site: { name: "asc" } }, { label: "asc" }],
    include: {
      site: { select: { id: true, name: true } },
      phoneModel: { select: { vendor: true, displayName: true } },
      firmwareTarget: { select: { version: true } },
    },
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      {/* Header */}
      <div style={{ background: "#111", borderBottom: "1px solid var(--card-border)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontWeight: 800, fontSize: 18 }}>Web<span style={{ color: "var(--accent)" }}>Prov</span></span>
        <span style={{ color: "var(--card-border)" }}>|</span>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{client.name}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{user.firstName ?? user.email}</span>
          <a href={`/portal/${clientSlug}/logout`} className="btn btn-ghost btn-sm">Déconnexion</a>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Mes téléphones</h1>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{phones.length} appareil(s) enregistré(s)</p>
        </div>
        <PortalPhoneList phones={phones} clientSlug={clientSlug} />
      </div>
    </div>
  );
}
