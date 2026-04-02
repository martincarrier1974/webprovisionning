import { Suspense } from "react";

import { ClientSelector } from "@/components/dashboard/client-selector";
import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{ clientId?: string }>;
};

export default async function LogsPage({ searchParams }: Props) {
  const { clientId } = await searchParams;

  const [clients, logs] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.provisionLog.findMany({
      where: clientId ? { phone: { clientId } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        phone: {
          select: {
            label: true,
            macAddress: true,
            client: { select: { name: true } },
            site: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          Logs de provisioning {selectedClient ? `— ${selectedClient.name}` : ""}
        </span>
        <Suspense fallback={null}>
          <ClientSelector clients={clients} selectedId={clientId} />
        </Suspense>
      </div>
      <div className="dashboard-content">
        <div className="card">
          <div className="section-header">
            <div>
              <div className="card-title">Provisioning</div>
              <div className="section-title">{logs.length} entrée(s) récentes</div>
            </div>
          </div>

          {logs.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun log pour le moment.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>Date</th>
                  <th style={{ padding: "8px 10px" }}>Téléphone</th>
                  <th style={{ padding: "8px 10px" }}>Vendor</th>
                  <th style={{ padding: "8px 10px" }}>MAC</th>
                  <th style={{ padding: "8px 10px" }}>Client</th>
                  <th style={{ padding: "8px 10px" }}>Message</th>
                  <th style={{ padding: "8px 10px" }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #1f1f1f" }}>
                    <td style={{ padding: "8px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {log.phone?.label || log.phone?.macAddress || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--muted)" }}>{log.vendor}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "var(--muted)" }}>{log.macAddress}</td>
                    <td style={{ padding: "8px 10px", color: "var(--muted)" }}>
                      {log.phone?.client?.name ?? "—"}
                      {log.phone?.site ? ` · ${log.phone.site.name}` : ""}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--muted)" }}>{log.message ?? "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span className="item-row-badge" style={{
                        background: log.success ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                        color: log.success ? "#4ade80" : "#f87171",
                      }}>
                        {log.success ? "OK" : `ERR ${log.statusCode ?? ""}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
