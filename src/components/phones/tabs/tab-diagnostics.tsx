"use client";

import { useState } from "react";

type Phone = {
  id: string;
  ipAddress?: string | null;
  sipServer?: string | null;
  sipPort?: number | null;
  sipUsername?: string | null;
  macAddress: string;
  phoneModel: { vendor: string; displayName: string };
};

type PortResult = { port: number; label: string; open: boolean; latencyMs: number | null };

type DiagAction = {
  id: string;
  label: string;
  icon: string;
  description: string;
  color?: string;
};

const ACTIONS: DiagAction[] = [
  { id: "ping",        icon: "📡", label: "Ping",           description: "4 paquets ICMP vers l'IP ou le serveur SIP" },
  { id: "traceroute",  icon: "🔀", label: "Traceroute",     description: "Chemin réseau jusqu'à l'hôte (max 15 sauts)" },
  { id: "port-check",  icon: "🔌", label: "Vérification ports", description: "SIP 5060/5061 + HTTP 80/443" },
  { id: "sip-options", icon: "📞", label: "SIP OPTIONS",    description: "Ping SIP vers le serveur d'enregistrement" },
  { id: "dns",         icon: "🌐", label: "DNS Lookup",     description: "Résolution DNS du serveur SIP", color: "#818cf8" },
];

export function TabDiagnostics({ phone: initialPhone }: { phone: Phone }) {
  const [phone, setPhone] = useState<Required<Phone>>({
    ...initialPhone,
    ipAddress: initialPhone.ipAddress ?? null,
    sipServer: initialPhone.sipServer ?? null,
    sipPort: initialPhone.sipPort ?? null,
    sipUsername: initialPhone.sipUsername ?? null,
  });
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { output?: string; portResults?: PortResult[]; error?: string }>>({});
  const [ipEdit, setIpEdit] = useState(initialPhone.ipAddress || "");
  const [sipPortEdit, setSipPortEdit] = useState(String(initialPhone.sipPort || ""));
  const [savingIp, setSavingIp] = useState(false);
  const [ipMsg, setIpMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveIp() {
    setSavingIp(true);
    setIpMsg(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ipAddress: ipEdit || null, sipPort: sipPortEdit ? Number(sipPortEdit) : null }),
      });
      const json = await res.json();
      if (json.ok) {
        setPhone(p => ({ ...p, ipAddress: ipEdit || null, sipPort: sipPortEdit ? Number(sipPortEdit) : null }));
        setIpMsg({ ok: true, text: "Sauvegardé." });
      } else {
        setIpMsg({ ok: false, text: json.error ?? "Erreur." });
      }
    } finally {
      setSavingIp(false);
    }
  }

  async function runAction(actionId: string) {
    setRunning(actionId);
    setResults(r => ({ ...r, [actionId]: {} }));
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/diagnose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: actionId }),
      });
      const json = await res.json();
      if (!json.ok) {
        setResults(r => ({ ...r, [actionId]: { error: json.error } }));
      } else if (json.results) {
        setResults(r => ({ ...r, [actionId]: { portResults: json.results } }));
      } else {
        setResults(r => ({ ...r, [actionId]: { output: json.output } }));
      }
    } catch {
      setResults(r => ({ ...r, [actionId]: { error: "Erreur réseau." } }));
    } finally {
      setRunning(null);
    }
  }

  const hasTarget = !!(phone.ipAddress || phone.sipServer);

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* ── Infos du téléphone ─────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 20px", background: "#111", borderBottom: "1px solid var(--card-border)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>Infos réseau</span>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div className="form-field">
            <label className="form-label">Adresse IP du téléphone</label>
            <input className="form-input" value={ipEdit} onChange={e => setIpEdit(e.target.value)} placeholder="192.168.1.50" style={{ fontFamily: "monospace" }} />
          </div>
          <div className="form-field">
            <label className="form-label">Port SIP (défaut 5060)</label>
            <input className="form-input" value={sipPortEdit} onChange={e => setSipPortEdit(e.target.value)} placeholder="5060" style={{ maxWidth: 100 }} />
          </div>
          <div>
            <label className="form-label">Serveur SIP configuré</label>
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>
              {phone.sipServer || <span style={{ opacity: 0.5 }}>Non configuré</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {ipMsg && <span style={{ fontSize: 12, color: ipMsg.ok ? "#4ade80" : "#f87171" }}>{ipMsg.text}</span>}
            <button className="btn btn-primary btn-sm" onClick={saveIp} disabled={savingIp}>
              {savingIp ? "..." : "Sauvegarder"}
            </button>
          </div>
        </div>
        <div style={{ padding: "8px 16px 14px", display: "flex", gap: 20 }}>
          {[
            { label: "MAC", value: phone.macAddress, mono: true },
            { label: "Modèle", value: phone.phoneModel.displayName },
            { label: "Vendor", value: phone.phoneModel.vendor },
            { label: "IP", value: phone.ipAddress || "—", mono: true },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 13, fontFamily: f.mono ? "monospace" : undefined, color: f.value === "—" ? "var(--muted)" : "var(--text)" }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {!hasTarget && (
        <div style={{ padding: "12px 16px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, fontSize: 13, color: "#fbbf24" }}>
          ⚠ Entrez une adresse IP ou configurez un serveur SIP pour utiliser les outils de diagnostic.
        </div>
      )}

      {/* ── Outils ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gap: 12 }}>
        {ACTIONS.map(action => {
          const result = results[action.id];
          const isRunning = running === action.id;

          return (
            <div key={action.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, background: "#111", borderBottom: result ? "1px solid var(--card-border)" : undefined }}>
                <span style={{ fontSize: 18 }}>{action.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{action.label}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{action.description}</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => runAction(action.id)}
                  disabled={isRunning || (!hasTarget && action.id !== "dns")}
                  style={{ minWidth: 90 }}
                >
                  {isRunning ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      En cours…
                    </span>
                  ) : "▶ Lancer"}
                </button>
              </div>

              {/* Results */}
              {result && (
                <div style={{ padding: 12 }}>
                  {result.error && (
                    <div style={{ color: "#f87171", fontSize: 13, padding: "6px 10px", background: "rgba(248,113,113,0.06)", borderRadius: 6 }}>
                      ✗ {result.error}
                    </div>
                  )}
                  {result.portResults && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                      {result.portResults.map(p => (
                        <div key={p.port} style={{
                          padding: "10px 14px", borderRadius: 8,
                          background: p.open ? "rgba(74,222,128,0.06)" : "rgba(248,113,113,0.06)",
                          border: `1px solid ${p.open ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: p.open ? "#4ade80" : "#f87171" }}>
                            {p.open ? "✓" : "✗"} Port {p.port}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.label}</div>
                          {p.open && p.latencyMs !== null && (
                            <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>{p.latencyMs} ms</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {result.output && (
                    <pre style={{
                      margin: 0, padding: "10px 14px", background: "#0a0a0a", borderRadius: 6,
                      fontFamily: "monospace", fontSize: 12, lineHeight: 1.6,
                      color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-all",
                      maxHeight: 300, overflowY: "auto",
                    }}>
                      {result.output}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
