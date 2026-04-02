"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Log = {
  id: string;
  createdAt: Date;
  success: boolean;
  statusCode: number | null;
  vendor: string;
  macAddress: string;
  requestPath: string;
  message: string | null;
  phone: {
    id: string;
    label: string | null;
    macAddress: string;
    client: { name: string };
    site: { name: string } | null;
  } | null;
};

export function LogsClient({ logs: initialLogs, clientId }: { logs: Log[]; clientId?: string }) {
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [filter, setFilter] = useState<"all" | "ok" | "err">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set("clientId", clientId);
      const res = await fetch(`/api/admin/logs?${params}`);
      const json = await res.json();
      if (json.ok) setLogs(json.logs);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (filter === "ok" && !log.success) return false;
      if (filter === "err" && log.success) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          log.macAddress.toLowerCase().includes(q) ||
          log.phone?.label?.toLowerCase().includes(q) ||
          log.phone?.client.name.toLowerCase().includes(q) ||
          log.message?.toLowerCase().includes(q) ||
          log.vendor.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filter, search]);

  const okCount = logs.filter(l => l.success).length;
  const errCount = logs.filter(l => !l.success).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { label: "Total", value: logs.length, color: "var(--text)" },
          { label: "Succès", value: okCount, color: "#4ade80" },
          { label: "Erreurs", value: errCount, color: errCount > 0 ? "#f87171" : "var(--muted)" },
          { label: "Téléphones uniques", value: new Set(logs.map(l => l.macAddress)).size, color: "var(--accent)" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="form-input"
          placeholder="Rechercher MAC, nom, client, message…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "ok", "err"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="btn btn-sm"
              style={{
                background: filter === f ? "var(--accent)" : "transparent",
                color: filter === f ? "#fff" : "var(--muted)",
                border: "1px solid " + (filter === f ? "var(--accent)" : "var(--card-border)"),
                borderRadius: 6,
              }}
            >
              {f === "all" ? "Tous" : f === "ok" ? "✓ OK" : "✗ Erreurs"}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading} style={{ marginLeft: "auto" }}>
          {loading ? "..." : "↻ Rafraîchir"}
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Aucun log.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0d0d0d", borderBottom: "1px solid var(--card-border)" }}>
                  {["Date", "Statut", "Téléphone", "Vendor", "MAC", "Client / Site", "Message"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <td style={{ padding: "7px 12px", color: "var(--muted)", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12 }}>
                      {new Date(log.createdAt).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                        background: log.success ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                        color: log.success ? "#4ade80" : "#f87171",
                      }}>
                        {log.success ? "✓ OK" : `✗ ${log.statusCode ?? "ERR"}`}
                      </span>
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      {log.phone ? (
                        <Link href={`/dashboard/phones/${log.phone.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>
                          {log.phone.label ?? log.phone.macAddress}
                        </Link>
                      ) : <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "7px 12px", color: "var(--muted)", fontSize: 12 }}>{log.vendor}</td>
                    <td style={{ padding: "7px 12px", fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{log.macAddress}</td>
                    <td style={{ padding: "7px 12px", fontSize: 12, color: "var(--muted)" }}>
                      {log.phone?.client.name ?? "—"}
                      {log.phone?.site && <span style={{ opacity: 0.6 }}> · {log.phone.site.name}</span>}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: 12, color: "var(--muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--card-border)", fontSize: 12, color: "var(--muted)" }}>
          {filtered.length} entrée{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""} sur {logs.length}
        </div>
      </div>
    </div>
  );
}
