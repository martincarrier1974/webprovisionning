import { Suspense } from "react";

import { CreateSiteForm } from "@/components/admin/create-site-form";
import { SiteManagementActions } from "@/components/admin/site-management-actions";
import { ClientSelector } from "@/components/dashboard/client-selector";
import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function SitesPage({ searchParams }: Props) {
  const { clientId } = await searchParams;

  const [clients, sites] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    db.site.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
      include: {
        client: { select: { id: true, name: true, slug: true } },
        _count: { select: { phones: true } },
      },
    }),
  ]);

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;
  const clientOptions = clients.map(({ id, name, slug }) => ({ id, name, slug }));

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          Sites {selectedClient ? `— ${selectedClient.name}` : ""}
        </span>
        <Suspense fallback={null}>
          <ClientSelector clients={clients} selectedId={clientId} />
        </Suspense>
      </div>
      <div className="dashboard-content">
        <div className="grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="card-title">Nouveau</div>
            <div className="card-heading">Ajouter un site</div>
            <p className="card-desc">Ajoute une succursale ou un emplacement pour un client existant.</p>
            <CreateSiteForm clients={clientOptions} />
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <div className="card-title">Sites</div>
                <div className="section-title">{sites.length} site(s)</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {sites.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun site.</p>
              ) : sites.map((site) => (
                <div key={site.id} className="item-row" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div className="item-row-info">
                    <div className="item-row-title">{site.name}</div>
                    <div className="item-row-sub">
                      {site.client.name} · {site.slug}
                      {site.city ? ` · ${site.city}` : ""}
                      {` · ${site._count.phones} téléphone(s)`}
                    </div>
                  </div>
                  <SiteManagementActions
                    site={{
                      id: site.id,
                      clientId: site.client.id,
                      name: site.name,
                      slug: site.slug,
                      address: site.address,
                      city: site.city,
                      province: site.province,
                      country: site.country,
                      timezone: site.timezone,
                    }}
                    clients={clientOptions.map(({ id, name }) => ({ id, name }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
