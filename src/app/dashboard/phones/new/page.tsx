import { CreatePhoneForm } from "@/components/admin/create-phone-form";
import { db } from "@/lib/db";

export default async function NewPhonePage() {
  const [clients, sites, phoneModels] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.site.findMany({
      orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, clientId: true },
    }),
    db.phoneModel.findMany({
      where: { isActive: true },
      orderBy: [{ vendor: "asc" }, { displayName: "asc" }],
      select: { id: true, vendor: true, modelCode: true, displayName: true },
    }),
  ]);

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          <a href="/dashboard/phones" style={{ color: "var(--muted)", marginRight: 8 }}>Téléphones</a>
          / Ajouter
        </span>
      </div>
      <div className="dashboard-content">
        <div style={{ maxWidth: 600 }}>
          <div className="card">
            <div className="card-title">Nouveau téléphone</div>
            <div className="card-heading" style={{ marginBottom: 4 }}>Ajouter un téléphone</div>
            <p className="card-desc">Associe un téléphone à un client, un site et un modèle.</p>
            <CreatePhoneForm
              clients={clients}
              sites={sites}
              phoneModels={phoneModels}
            />
          </div>
        </div>
      </div>
    </>
  );
}
