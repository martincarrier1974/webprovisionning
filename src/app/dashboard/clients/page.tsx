import { ClientManagementActions } from "@/components/admin/client-management-actions";
import { CreateClientForm } from "@/components/admin/create-client-form";
import { db } from "@/lib/db";

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { sites: true, phones: true } } },
  });

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">Clients</span>
      </div>
      <div className="dashboard-content">
        <div className="grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="card-title">Nouveau</div>
            <div className="card-heading">Ajouter un client</div>
            <p className="card-desc">Crée une organisation pour regrouper sites et téléphones.</p>
            <CreateClientForm />
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <div className="card-title">Clients</div>
                <div className="section-title">{clients.length} client(s) configuré(s)</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {clients.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun client.</p>
              ) : clients.map((client) => (
                <div key={client.id} className="item-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="item-row-info">
                      <div className="item-row-title">{client.name}</div>
                      <div className="item-row-sub">{client.slug} · {client._count.sites} site(s) · {client._count.phones} téléphone(s)</div>
                    </div>
                    <ClientManagementActions client={client} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
