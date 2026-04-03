import { Suspense } from "react";
import Link from "next/link";

import { ClientSelector } from "@/components/dashboard/client-selector";
import { db } from "@/lib/db";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { translateStatus } from "@/lib/i18n/status";

type Props = { searchParams: Promise<{ clientId?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const { clientId } = await searchParams;
  const [clients, summary] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getDashboardSummary(clientId),
  ]);
  const selectedClient = clientId ? clients.find(c => c.id === clientId) : null;

  const maxActivity = Math.max(...summary.activityByDay.map(d => d.ok + d.err), 1);

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

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Téléphones",   value: summary.phones.total,           sub: `${summary.phones.active} actifs`,     href: "/dashboard/phones",  color: "var(--accent)" },
            { label: "En attente",   value: summary.phones.staged,          sub: "non provisionnés",                     href: "/dashboard/phones",  color: "#fbbf24" },
            { label: "Clients",      value: summary.clients,                sub: "comptes",                              href: "/dashboard/clients", color: "#60a5fa" },
            { label: "Sites",        value: summary.sites,                  sub: "emplacements",                         href: "/dashboard/sites",   color: "#a78bfa" },
            { label: "Prov. 24h",    value: summary.provisioning.last24h,   sub: "requêtes reçues",                      href: "/dashboard/logs",    color: "#4ade80" },
            { label: "Erreurs 24h",  value: summary.provisioning.errors24h, sub: "échecs",                               href: "/dashboard/logs",    color: summary.provisioning.errors24h > 0 ? "#f87171" : "#4ade80" },
          ].map(s => (
            <a key={s.label} href={s.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "14px 18px", transition: "border-color 0.15s", cursor: "pointer" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.sub}</div>
              </div>
            </a>
          ))}
        </div>

        {/* ── Activity + Errors ──────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Activity bar chart */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>Activité — 7 derniers jours</span>
              <Link href="/dashboard/logs" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>Voir logs →</Link>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                {summary.activityByDay.map(day => {
                  const total = day.ok + day.err;
                  const heightPct = total / maxActivity;
                  const label = new Date(day.date + "T12:00:00").toLocaleDateString("fr-CA", { weekday: "short" });
                  return (
                    <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 64 }}>
                        {total > 0 && (
                          <div style={{ width: "100%", borderRadius: "3px 3px 0 0", overflow: "hidden" }}>
                            {day.err > 0 && (
                              <div style={{ height: Math.max(4, (day.err / maxActivity) * 64), background: "#f87171", width: "100%" }} />
                            )}
                            <div style={{ height: Math.max(4, (day.ok / maxActivity) * 64), background: "var(--accent)", width: "100%" }} />
                          </div>
                        )}
                        {total === 0 && <div style={{ height: 4, background: "#222", borderRadius: 2, width: "100%" }} />}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "capitalize" }}>{label}</div>
                      {total > 0 && <div style={{ fontSize: 10, color: "var(--muted)" }}>{total}</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)", display: "inline-block" }} />Succès
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f87171", display: "inline-block" }} />Erreurs
                </span>
              </div>
            </div>
          </div>

          {/* Recent errors */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#f87171" }}>Erreurs récentes (24h)</span>
              <Link href="/dashboard/logs" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>Voir tout →</Link>
            </div>
            {summary.recentErrors.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#4ade80", fontSize: 13 }}>✓ Aucune erreur dans les dernières 24h</div>
            ) : (
              <div>
                {summary.recentErrors.map((e, i) => (
                  <div key={i} style={{ padding: "10px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, color: "#f87171", flexShrink: 0 }}>✗</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: "var(--accent)" }}>{e.label ?? e.macAddress}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{e.message ?? "Erreur provisioning"}</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{new Date(e.createdAt).toLocaleTimeString("fr-CA")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent phones + Recent logs ──────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Recent phones */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>Derniers provisionnés</span>
              <Link href="/dashboard/phones" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>Voir tout →</Link>
            </div>
            {summary.recentPhones.map(p => (
              <Link key={p.id} href={`/dashboard/phones/${p.id}`} style={{ textDecoration: "none" }}>
                <div style={{ padding: "9px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{p.label ?? p.macAddress}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {p.phoneModel.displayName} · {p.client.name}{p.site ? ` · ${p.site.name}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusBadge status={p.status} />
                    {p.lastProvisionedAt && (
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
                        {new Date(p.lastProvisionedAt).toLocaleDateString("fr-CA")}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {summary.recentPhones.length === 0 && (
              <div style={{ padding: 24, color: "var(--muted)", fontSize: 13, textAlign: "center" }}>Aucun téléphone.</div>
            )}
          </div>

          {/* Recent logs */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>Logs récents</span>
              <Link href="/dashboard/logs" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>Voir tout →</Link>
            </div>
            {summary.recentLogs.map(log => (
              <div key={log.id} style={{ padding: "8px 16px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 99, fontWeight: 600, flexShrink: 0,
                  background: log.success ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                  color: log.success ? "#4ade80" : "#f87171",
                }}>
                  {log.success ? "OK" : "ERR"}
                </span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.phone?.label ?? log.macAddress}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {log.vendor} · {new Date(log.createdAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            {summary.recentLogs.length === 0 && (
              <div style={{ padding: 24, color: "var(--muted)", fontSize: 13, textAlign: "center" }}>Aucun log.</div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE:   { bg: "rgba(74,222,128,0.12)",   color: "#4ade80" },
    STAGED:   { bg: "rgba(251,191,36,0.12)",   color: "#fbbf24" },
    DISABLED: { bg: "rgba(248,113,113,0.12)",  color: "#f87171" },
    RETIRED:  { bg: "rgba(100,116,139,0.12)",  color: "#64748b" },
  };
  const s = map[status] ?? { bg: "#1a1a1a", color: "#888" };
  return (
    <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 99, background: s.bg, color: s.color, fontWeight: 600 }}>
      {translateStatus(status)}
    </span>
  );
}
