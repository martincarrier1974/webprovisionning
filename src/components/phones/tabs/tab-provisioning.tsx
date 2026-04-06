"use client";

import { useState } from "react";

type Log = {
  id: string;
  createdAt: Date;
  success: boolean;
  statusCode: number | null;
  message: string | null;
  requestPath: string;
};

type Phone = {
  id: string;
  macAddress: string;
  provisioningEnabled: boolean;
  lastProvisionedAt: Date | null;
  provisionLogs: Log[];
  phoneModel: { vendor: string };
};

export function TabProvisioning({
  phone,
  provisioningFetchPath,
  provisioningDisplayUrl,
  grandstreamConfigServerUrl,
}: {
  phone: Phone;
  provisioningFetchPath: string;
  provisioningDisplayUrl: string;
  grandstreamConfigServerUrl: string | null;
}) {
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewConfig, setPreviewConfig] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [logs, setLogs] = useState<Log[]>(phone.provisionLogs);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const isGrandstream = phone.phoneModel.vendor.toUpperCase() === "GRANDSTREAM";
  const copyUrl = isGrandstream && grandstreamConfigServerUrl ? grandstreamConfigServerUrl : provisioningDisplayUrl;

  async function testConfig() {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch(provisioningFetchPath);
      if (res.ok) {
        setPushResult({ ok: true, text: `✓ Réponse ${res.status} — config générée avec succès.` });
      } else {
        setPushResult({ ok: false, text: `✗ Erreur ${res.status} — ${res.statusText}` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPushResult({ ok: false, text: `✗ Erreur réseau (${msg}). Si le tableau de bord n’est pas sur le même site que l’API, activez NEXT_PUBLIC_APP_URL ou testez depuis le déploiement Railway.` });
    } finally {
      setPushing(false);
    }
  }

  async function loadPreview() {
    setLoadingPreview(true);
    setPreviewConfig(null);
    try {
      const res = await fetch(provisioningFetchPath);
      const text = await res.text();
      setPreviewConfig(text);
    } catch {
      setPreviewConfig("Erreur lors du chargement de la configuration.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function refreshLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/logs`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingLogs(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>

      {/* ── URL & Actions ────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", background: "#111", borderBottom: "1px solid var(--card-border)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>URL de provisioning</span>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
              {isGrandstream ? "URL sur le téléphone (Config Server Path)" : `URL (${phone.phoneModel.vendor})`}
            </div>
            {isGrandstream && grandstreamConfigServerUrl && (
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                Le poste ajoute automatiquement le fichier <code style={{ fontFamily: "monospace" }}>cfg&lt;MAC&gt;.xml</code> à cette adresse. Le bouton « Tester » appelle l’API du tableau de bord (même origine).
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" readOnly value={copyUrl} style={{ fontFamily: "monospace", fontSize: 12, flex: 1 }} />
              <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(copyUrl)}>Copier</button>
            </div>
            {isGrandstream && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Test / aperçu (fichier généré pour cette MAC)</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="form-input" readOnly value={provisioningDisplayUrl} style={{ fontFamily: "monospace", fontSize: 12, flex: 1 }} />
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigator.clipboard.writeText(provisioningDisplayUrl)}>Copier</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Dernier provisioning</div>
              <span style={{ fontSize: 14, color: phone.lastProvisionedAt ? "#4ade80" : "var(--muted)" }}>
                {phone.lastProvisionedAt
                  ? new Date(phone.lastProvisionedAt).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })
                  : "Jamais"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
              <button className="btn btn-ghost btn-sm" onClick={loadPreview} disabled={loadingPreview}>
                {loadingPreview ? "Chargement..." : "👁 Prévisualiser la config"}
              </button>
              <button className="btn btn-primary" onClick={testConfig} disabled={pushing}>
                {pushing ? "Test en cours..." : "▶ Tester"}
              </button>
            </div>
          </div>
          {pushResult && (
            <div style={{ fontSize: 13, padding: "8px 12px", borderRadius: 6, background: pushResult.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", color: pushResult.ok ? "#4ade80" : "#f87171" }}>
              {pushResult.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Config Preview ───────────────────────────────────────────── */}
      {previewConfig !== null && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>Configuration générée</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPreviewConfig(null)}>✕ Fermer</button>
          </div>
          <pre style={{
            padding: 20, margin: 0, overflow: "auto", maxHeight: 400,
            fontFamily: "monospace", fontSize: 12, lineHeight: 1.6,
            color: "var(--text)", background: "#0a0a0a", whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {previewConfig}
          </pre>
        </div>
      )}

      {/* ── Logs ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>Historique de provisioning</span>
          <button className="btn btn-ghost btn-sm" onClick={refreshLogs} disabled={loadingLogs}>
            {loadingLogs ? "..." : "↻ Rafraîchir"}
          </button>
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: 24, color: "var(--muted)", fontSize: 14, textAlign: "center" }}>
            Aucun log pour ce téléphone.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0d0d0d", borderBottom: "1px solid var(--card-border)" }}>
                  {["Date / Heure", "Statut", "Code", "Chemin", "Message"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <td style={{ padding: "7px 12px", color: "var(--muted)", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12 }}>
                      {new Date(log.createdAt).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      <span style={{
                        fontSize: 11, padding: "2px 9px", borderRadius: 99, fontWeight: 600,
                        background: log.success ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                        color: log.success ? "#4ade80" : "#f87171",
                      }}>
                        {log.success ? "✓ OK" : "✗ ERR"}
                      </span>
                    </td>
                    <td style={{ padding: "7px 12px", fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>
                      {log.statusCode ?? "—"}
                    </td>
                    <td style={{ padding: "7px 12px", fontFamily: "monospace", fontSize: 11, color: "var(--muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.requestPath}
                    </td>
                    <td style={{ padding: "7px 12px", color: "var(--muted)", fontSize: 12 }}>
                      {log.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
