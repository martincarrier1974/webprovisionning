import { Suspense } from "react";

import { PhoneExportCard } from "@/components/admin/phone-export-card";
import { PhoneImportForm } from "@/components/admin/phone-import-form";
import { ClientSelector } from "@/components/dashboard/client-selector";
import { PhonesTable } from "@/components/phones/phones-table";
import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function PhonesPage({ searchParams }: Props) {
  const { clientId } = await searchParams;

  const [clients, phones] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.phone.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: [{ client: { name: "asc" } }, { label: "asc" }],
      include: {
        client: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
        phoneModel: { select: { id: true, vendor: true, modelCode: true, displayName: true } },
        firmwareTarget: { select: { id: true, version: true } },
      },
    }),
  ]);

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          Téléphones {selectedClient ? `— ${selectedClient.name}` : ""}
          <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 400, marginLeft: 10 }}>
            {phones.length} appareil(s)
          </span>
        </span>
        <Suspense fallback={null}>
          <ClientSelector clients={clients} selectedId={clientId} />
        </Suspense>
      </div>

      <div className="dashboard-content">
        {/* Actions bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <a href="/dashboard/phones/new" className="btn btn-primary">+ Ajouter un téléphone</a>
          <PhoneExportCard inline />
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <details style={{ position: "relative" }}>
              <summary className="btn btn-ghost" style={{ listStyle: "none", cursor: "pointer" }}>Importer CSV ▾</summary>
              <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 100, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 20, minWidth: 340, marginTop: 6 }}>
                <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 12 }}>
                  Colonnes requises : <code>mac_address</code>, <code>client_identifiant</code>, <code>model_code</code>
                </p>
                <PhoneImportForm />
              </div>
            </details>
          </div>
        </div>

        {/* Table */}
        <PhonesTable phones={phones} />
      </div>
    </>
  );
}
