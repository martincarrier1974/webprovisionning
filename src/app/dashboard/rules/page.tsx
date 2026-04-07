import { Suspense } from "react";

import { CreateProvisioningRuleForm } from "@/components/admin/create-provisioning-rule-form";
import { DeleteRuleButton } from "@/components/admin/delete-rule-button";
import { ClientSelector } from "@/components/dashboard/client-selector";
import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function RulesPage({ searchParams }: Props) {
  const { clientId } = await searchParams;

  const [clients, sites, phoneModels, phones, rules] = await Promise.all([
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
      orderBy: { label: "asc" },
      select: { id: true, label: true, macAddress: true },
    }),
    db.provisioningRule.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: [{ source: "asc" }, { sortOrder: "asc" }],
      include: {
        client: { select: { name: true } },
        site: { select: { name: true } },
        phoneModel: { select: { vendor: true, displayName: true } },
        phone: { select: { label: true, macAddress: true } },
      },
    }),
  ]);

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;
  const clientOptions = clients.map(({ id, name }) => ({ id, name }));
  const siteOptions = sites.map(({ id, name }) => ({ id, name }));
  const phoneModelOptions = phoneModels.map(({ id, displayName, vendor }) => ({ id, displayName, vendor }));
  const phoneOptions = phones.map(({ id, label, macAddress }) => ({ id, label: label || macAddress }));

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          Règles de provisioning {selectedClient ? `— ${selectedClient.name}` : ""}
        </span>
        <Suspense fallback={null}>
          <ClientSelector clients={clients} selectedId={clientId} />
        </Suspense>
      </div>
      <div className="dashboard-content">
        <div className="grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="card-title">Nouvelle règle</div>
            <div className="card-heading">Ajouter une règle</div>
            <p className="card-desc">Résolution : default → client → site → modèle → téléphone.</p>
            <CreateProvisioningRuleForm
              clients={clientOptions}
              sites={siteOptions}
              phoneModels={phoneModelOptions}
              phones={phoneOptions}
            />
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <div className="card-title">Règles</div>
                <div className="section-title">{rules.length} règle(s)</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {rules.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucune règle.</p>
              ) : rules.map((rule) => (
                <div key={rule.id} className="item-row">
                  <div className="item-row-info">
                    <div className="item-row-title">{rule.key} = <span style={{ color: "var(--accent)" }}>{rule.value}</span></div>
                    <div className="item-row-sub">
                      {rule.source}
                      {rule.client ? ` · ${rule.client.name}` : ""}
                      {rule.site ? ` · ${rule.site.name}` : ""}
                      {rule.phoneModel ? ` · ${rule.phoneModel.displayName}` : ""}
                      {rule.phone ? ` · ${rule.phone.label || rule.phone.macAddress}` : ""}
                      {` · ordre ${rule.sortOrder}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="item-row-badge">{rule.source}</span>
                    <DeleteRuleButton id={rule.id} />
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
