"use client";

import { useState } from "react";

type Phone = { id: string; macAddress: string; phoneModel: { vendor: string } };

export function TabDiagnostics({ phone }: { phone: Phone }) {
  const [pingTarget, setPingTarget] = useState("");
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [rebootResult, setRebootResult] = useState<string | null>(null);
  const [rebooting, setRebooting] = useState(false);
  const [resyncResult, setResyncResult] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);

  async function doPing() {
    if (!pingTarget.trim()) return;
    setPinging(true);
    setPingResult(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/ping`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: pingTarget }),
      });
      const json = await res.json();
      setPingResult(json.output ?? json.error ?? "Aucun résultat.");
    } catch {
      setPingResult("Erreur réseau.");
    } finally {
      setPinging(false);
    }
  }

  async function doReboot() {
    if (!window.confirm("Redémarrer ce téléphone ?")) return;
    setRebooting(true);
    setRebootResult(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/reboot`, { method: "POST" });
      const json = await res.json();
      setRebootResult(json.ok ? "✓ Commande de redémarrage envoyée." : `✗ ${json.error}`);
    } catch {
      setRebootResult("✗ Erreur réseau.");
    } finally {
      setRebooting(false);
    }
  }

  async function doResync() {
    setResyncing(true);
    setResyncResult(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/resync`, { method: "POST" });
      const json = await res.json();
      setResyncResult(json.ok ? "✓ Resynchronisation envoyée." : `✗ ${json.error}`);
    } catch {
      setResyncResult("✗ Erreur réseau.");
    } finally {
      setResyncing(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Outils de redémarrage */}
      <div className="card">
        <div className="card-title">Contrôle à distance</div>
        <div className="card-heading" style={{ marginBottom: 16 }}>Outils de redémarrage</div>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
          Ces commandes nécessitent que le téléphone soit joignable depuis ce serveur (même réseau ou VPN).
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div>
            <button className="btn btn-ghost" onClick={doReboot} disabled={rebooting} style={{ borderColor: "#fbbf24", color: "#fbbf24" }}>
              {rebooting ? "..." : "🔄 Redémarrer"}
            </button>
            {rebootResult && <div style={{ fontSize: 12, marginTop: 6, color: rebootResult.startsWith("✓") ? "#4ade80" : "#f87171" }}>{rebootResult}</div>}
          </div>
          <div>
            <button className="btn btn-ghost" onClick={doResync} disabled={resyncing} style={{ borderColor: "#60a5fa", color: "#60a5fa" }}>
              {resyncing ? "..." : "🔃 Resync config"}
            </button>
            {resyncResult && <div style={{ fontSize: 12, marginTop: 6, color: resyncResult.startsWith("✓") ? "#4ade80" : "#f87171" }}>{resyncResult}</div>}
          </div>
          <div>
            <button className="btn btn-danger" onClick={() => { if (window.confirm("Réinitialisation usine ? Cette action est irréversible.")) doReboot(); }}>
              ⚠ Réinit. usine
            </button>
          </div>
        </div>
      </div>

      {/* Ping */}
      <div className="card">
        <div className="card-title">Réseau</div>
        <div className="card-heading" style={{ marginBottom: 16 }}>Ping / Traceroute</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            className="form-input"
            value={pingTarget}
            onChange={e => setPingTarget(e.target.value)}
            placeholder="IP ou domaine (ex: 8.8.8.8)"
            style={{ maxWidth: 300 }}
            onKeyDown={e => e.key === "Enter" && doPing()}
          />
          <button className="btn btn-primary" onClick={doPing} disabled={pinging || !pingTarget.trim()}>
            {pinging ? "..." : "▶ Ping"}
          </button>
        </div>
        {pingResult && (
          <pre style={{ background: "#0d0d0d", border: "1px solid var(--card-border)", borderRadius: 8, padding: 14, fontSize: 12, color: "#e2e8f0", overflowX: "auto", maxHeight: 300 }}>
            {pingResult}
          </pre>
        )}
      </div>

      {/* Info */}
      <div className="card">
        <div className="card-title">Appareil</div>
        <div className="card-heading" style={{ marginBottom: 12 }}>Informations</div>
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <Row label="Adresse MAC" value={<span style={{ fontFamily: "monospace", color: "var(--accent)" }}>{phone.macAddress}</span>} />
          <Row label="Fabricant" value={phone.phoneModel.vendor} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <span style={{ color: "var(--muted)", minWidth: 160 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
