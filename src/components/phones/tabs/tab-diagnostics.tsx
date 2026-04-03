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
type ImportedRule = { key: string; value: string };

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

  // Import config state
  const [importing, setImporting] = useState(false);
  const [importedRules, setImportedRules] = useState<ImportedRule[] | null>(null);
  const [importTotal, setImportTotal] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFilter, setImportFilter] = useState("");
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ipEdit, setIpEdit] = useState(initialPhone.ipAddress || "");
  const [sipPortEdit, setSipPortEdit] = useState(String(initialPhone.sipPort || ""));
  const [savingIp, setSavingIp] = useState(false);
  const [ipMsg, setIpMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function discoverIp() {
    setSavingIp(true);
    setIpMsg(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/discover-ip`, { method: "POST" });
      const json = await res.json();
      if (json.ok && json.ip) {
        setIpEdit(json.ip);
        setPhone(p => ({ ...p, ipAddress: json.ip }));
        setIpMsg({ ok: true, text: `✓ IP détectée : ${json.ip}` });
      } else {
        setIpMsg({ ok: false, text: json.error ?? "Introuvable." });
      }
    } catch {
      setIpMsg({ ok: false, text: "Erreur réseau." });
    } finally {
      setSavingIp(false);
    }
  }

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

  async function importConfig() {
    setImporting(true);
    setImportedRules(null);
    setImportError(null);
    setApplyMsg(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/import-config`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setImportedRules(json.rules);
        setImportTotal(json.total);
        setSelectedRules(new Set(json.rules.map((r: ImportedRule) => r.key)));
      } else {
        setImportError(json.error ?? "Erreur import.");
      }
    } catch {
      setImportError("Erreur réseau.");
    } finally {
      setImporting(false);
    }
  }

  async function applyImport() {
    if (!importedRules) return;
    setApplying(true);
    setApplyMsg(null);
    try {
      const rules = importedRules
        .filter(r => selectedRules.has(r.key))
        .map(r => ({ key: r.key, value: r.value }));
      const res = await fetch(`/api/admin/phones/${phone.id}/rules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const json = await res.json();
      setApplyMsg(json.ok
        ? { ok: true, text: `✓ ${rules.length} règles importées comme overrides PHONE.` }
        : { ok: false, text: json.error ?? "Erreur." });
    } catch {
      setApplyMsg({ ok: false, text: "Erreur réseau." });
    } finally {
      setApplying(false);
    }
  }

  const filteredImport = (importedRules ?? []).filter(r =>
    !importFilter || r.key.toLowerCase().includes(importFilter.toLowerCase()) || r.value.toLowerCase().includes(importFilter.toLowerCase())
  );

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
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {ipMsg && <span style={{ fontSize: 12, color: ipMsg.ok ? "#4ade80" : "#f87171" }}>{ipMsg.text}</span>}
            <button className="btn btn-ghost btn-sm" onClick={discoverIp} disabled={savingIp} title="Cherche l'IP dans la table ARP du serveur">
              {savingIp ? "..." : "🔍 Détecter"}
            </button>
            <button className="btn btn-primary btn-sm" onClick={saveIp} disabled={savingIp}>
              Sauvegarder
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

      {/* ── Import config ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>📥</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Importer la config actuelle</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Récupère la config du téléphone et l&apos;importe comme overrides PHONE</div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={importConfig}
            disabled={importing || !phone.ipAddress}
            style={{ minWidth: 120 }}
          >
            {importing ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Lecture…
              </span>
            ) : "↓ Lire config"}
          </button>
        </div>

        {importError && (
          <div style={{ padding: "12px 16px", color: "#f87171", fontSize: 13 }}>✗ {importError}</div>
        )}

        {importedRules && (
          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#4ade80" }}>{importTotal} valeurs lues · {selectedRules.size} sélectionnées</span>
              <input
                className="form-input"
                value={importFilter}
                onChange={e => setImportFilter(e.target.value)}
                placeholder="Filtrer clé / valeur…"
                style={{ maxWidth: 220, padding: "4px 10px", fontSize: 12 }}
              />
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRules(new Set(importedRules.map(r => r.key)))}>Tout</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRules(new Set())}>Aucun</button>
              </div>
            </div>

            <div style={{ border: "1px solid var(--card-border)", borderRadius: 6, overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", background: "#0d0d0d", padding: "6px 12px", gap: 8 }}>
                <span />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Clé</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Valeur</span>
              </div>
              {filteredImport.map(rule => (
                <div key={rule.key} style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", borderTop: "1px solid #1a1a1a", padding: "5px 12px", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedRules.has(rule.key)}
                    onChange={e => setSelectedRules(prev => {
                      const s = new Set(prev);
                      e.target.checked ? s.add(rule.key) : s.delete(rule.key);
                      return s;
                    })}
                    style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                  />
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--accent)" }}>{rule.key}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rule.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
              {applyMsg && <span style={{ fontSize: 13, color: applyMsg.ok ? "#4ade80" : "#f87171" }}>{applyMsg.text}</span>}
              <button
                className="btn btn-primary"
                onClick={applyImport}
                disabled={applying || selectedRules.size === 0}
              >
                {applying ? "Importation…" : `↑ Appliquer ${selectedRules.size} règle${selectedRules.size > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
