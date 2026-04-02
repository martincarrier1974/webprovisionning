import { Suspense } from "react";

import { CreatePhoneForm } from "@/components/admin/create-phone-form";
import { EditPhoneForm } from "@/components/admin/edit-phone-form";
import { PhoneExportCard } from "@/components/admin/phone-export-card";
import { PhoneImportForm } from "@/components/admin/phone-import-form";
import { ClientSelector } from "@/components/dashboard/client-selector";
import { db } from "@/lib/db";
import { translateStatus } from "@/lib/i18n/status";

type Props = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function PhonesPage({ searchParams }: Props) {
  const { clientId } = await searchParams;

  const [clients, sites, phoneModels, phones] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.site.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, clientId: true },
    }),
    db.phoneModel.findMany({
      where: { isActive: true },
      orderBy: [{ vendor: "asc" }, { displayName: "asc" }],
      select: { id: true, vendor: true, modelCode: true, displayName: true },
    }),
    db.phone.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, clientId: true } },
        phoneModel: { select: { id: true, vendor: true, modelCode: true, displayName: true } },
      },
    }),
  ]);

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;
  const clientOptions = clients.map(({ id, name }) => ({ id, name }));
  const siteOptions = sites.map(({ id, name, clientId }) => ({ id, name, clientId }));
  const phoneModelOptions = phoneModels.map(({ id, displayName, vendor, modelCode }) => ({ id, displayName, vendor, modelCode }));

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          Téléphones {selectedClient ? `— ${selectedClient.name}` : ""}
        </span>
        <Suspense fallback={null}>
          <ClientSelector clients={clients} selectedId={clientId} />
        </Suspense>
      </div>
      <div className="dashboard-content">
        <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
          <div className="card">
            <div className="card-title">Nouveau</div>
            <div className="card-heading">Ajouter un téléphone</div>
            <p className="card-desc">Associe un téléphone à un client, un site et un modèle.</p>
            <CreatePhoneForm clients={clientOptions} sites={siteOptions} phoneModels={phoneModelOptions} />
          </div>
          <div style={{ display: "grid", gap: 20 }}>
            <PhoneExportCard />
            <div className="card">
              <div className="card-title">CSV</div>
              <div className="card-heading">Importer des téléphones</div>
              <p className="card-desc">Colonnes requises : <code>mac_address</code>, <code>client_identifiant</code>, <code>model_code</code>.</p>
              <PhoneImportForm />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <div>
              <div className="card-title">Téléphones</div>
              <div className="section-title">{phones.length} téléphone(s)</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {phones.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun téléphone pour le moment.</p>
            ) : phones.map((phone) => (
              <div key={phone.id} className="item-row" style={{ flexWrap: "wrap", gap: 12 }}>
                <div className="item-row-info">
                  <div className="item-row-title">{phone.label || phone.macAddress}</div>
                  <div className="item-row-sub">
                    {phone.phoneModel.vendor} · {phone.phoneModel.displayName}
                    {phone.site ? ` · ${phone.site.name}` : ""}
                    {!clientId ? ` · ${phone.client.name}` : ""}
                    {" · "}<span style={{ fontFamily: "monospace" }}>{phone.macAddress}</span>
                  </div>
                </div>
                <span className="item-row-badge">{translateStatus(phone.status)}</span>
                <EditPhoneForm
                  phone={{
                    id: phone.id,
                    clientId: phone.client.id,
                    siteId: phone.site?.id ?? null,
                    phoneModelId: phone.phoneModel.id,
                    macAddress: phone.macAddress,
                    label: phone.label,
                    extensionNumber: phone.extensionNumber,
                    sipUsername: phone.sipUsername,
                    sipPassword: phone.sipPassword,
                    sipServer: phone.sipServer,
                    webPassword: phone.webPassword,
                    adminPassword: phone.adminPassword,
                    status: phone.status,
                  }}
                  clients={clientOptions}
                  sites={siteOptions}
                  phoneModels={phoneModelOptions}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
