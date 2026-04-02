import { Suspense } from "react";

import { ClientSelector } from "@/components/dashboard/client-selector";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { db } from "@/lib/db";
import { getDashboardSummary } from "@/lib/dashboard/summary";

type Props = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { clientId } = await searchParams;

  const [clients, stats] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getDashboardSummary(),
  ]);

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;

  const recentPhones = await db.phone.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      client: { select: { name: true } },
      site: { select: { name: true } },
      phoneModel: { select: { vendor: true, displayName: true } },
    },
  });

  const recentLogs = await db.provisionLog.findMany({
    where: clientId ? { phone: { clientId } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      phone: { select: { label: true, macAddress: true } },
    },
  });

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          {selectedClient ? `Client : ${selectedClient.name}` : "Vue d'ensemble"}
        </span>
        <Suspense fallback={null}>
          <ClientSelector clients={clients} selectedId={clientId} />
        </Suspense>
      </div>

      <div className="dashboard-content">
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <SummaryCards stats={stats} />
        </div>

        <div className="grid-2" style={{ gap: 24 }}>
          {/* Téléphones récents */}
          <div className="card">
            <div className="section-header">
              <div>
                <div className="card-title">Téléphones</div>
                <div className="section-title">
                  {selectedClient ? `Téléphones — ${selectedClient.name}` : "Derniers téléphones"}
                </div>
              </div>
              <a href="/dashboard/phones" className="btn btn-ghost btn-sm">Voir tout</a>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {recentPhones.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun téléphone.</p>
              ) : recentPhones.map((phone) => (
                <div key={phone.id} className="item-row">
                  <div className="item-row-info">
                    <div className="item-row-title">{phone.label || phone.macAddress}</div>
                    <div className="item-row-sub">
                      {phone.phoneModel.vendor} · {phone.phoneModel.displayName}
                      {phone.site ? ` · ${phone.site.name}` : ""}
                      {!clientId ? ` · ${phone.client.name}` : ""}
                    </div>
                  </div>
                  <span className="item-row-badge">{phone.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Logs récents */}
          <div className="card">
            <div className="section-header">
              <div>
                <div className="card-title">Provisioning</div>
                <div className="section-title">Logs récents</div>
              </div>
              <a href="/dashboard/logs" className="btn btn-ghost btn-sm">Voir tout</a>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {recentLogs.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun log.</p>
              ) : recentLogs.map((log) => (
                <div key={log.id} className="item-row">
                  <div className="item-row-info">
                    <div className="item-row-title">
                      {log.phone?.label || log.phone?.macAddress || log.macAddress}
                    </div>
                    <div className="item-row-sub">
                      {log.vendor} · {new Date(log.createdAt).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}
                      {log.message ? ` · ${log.message}` : ""}
                    </div>
                  </div>
                  <span className="item-row-badge" style={{ background: log.success ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)", color: log.success ? "#4ade80" : "#f87171" }}>
                    {log.success ? "OK" : "ERR"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
