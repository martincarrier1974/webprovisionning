"use client";

import { useState } from "react";

type Log = { id: string; createdAt: Date; success: boolean; statusCode: number | null; message: string | null };
type Phone = { id: string; macAddress: string; provisioningEnabled: boolean; lastProvisionedAt: Date | null; provisionLogs: Log[]; phoneModel: { vendor: string } };

export function TabProvisioning({ phone, provisioningUrl }: { phone: Phone; provisioningUrl: string }) {
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  async function pushConfig() {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch(provisioningUrl);
      if (res.ok) {
        setPushResult("✓ Configuration récupérée avec succès.");
      } else {
        setPushResult(`✗ Erreur ${res.status} — ${res.statusText}`);
      }
    } catch {
      setPushResult("✗ Erreur réseau.");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card">
        <div className="card-title">Provisioning</div>
        <div className="card-heading" style={{ marginBottom: 16 }}>URL de configuration</div>
        <div className="form-grid" style={{ maxWidth: 640 }}>
          <div className="form-field">
            <label className="form-label">URL provisioning ({phone.phoneModel.vendor})</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" readOnly value={provisioningUrl} style={{ fontFamily: "monospace", fontSize: 12 }} />
              <button className="btn btn-ghost btn-sm" style={{ whiteSpace: "nowrap" }} onClick={() => navigator.clipboard.writeText(provisioningUrl)}>
                Copier
              </button>
            </div>
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: 8, display: "block" }}>Dernier provisioning</label>
            <span style={{ fontSize: 14, color: phone.lastProvisionedAt ? "#4ade80" : "var(--muted)" }}>
              {phone.lastProvisionedAt
                ? new Date(phone.lastProvisionedAt).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })
                : "Jamais"}
            </span>
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: 8, display: "block" }}>Test de provisioning</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn btn-primary" onClick={pushConfig} disabled={pushing}>
                {pushing ? "Vérification..." : "▶ Tester la config"}
              </button>
              {pushResult && (
                <span style={{ fontSize: 13, color: pushResult.startsWith("✓") ? "#4ade80" : "#f87171" }}>
                  {pushResult}
                </span>
              )}
            </div>
            <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
              Simule une requête de provisioning depuis ce serveur vers l'URL ci-dessus.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Historique</div>
        <div className="card-heading" style={{ marginBottom: 16 }}>Derniers logs de provisioning</div>
        {phone.provisionLogs.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun log pour ce téléphone.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted)" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>Statut</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {phone.provisionLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "6px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "medium" })}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: log.success ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)", color: log.success ? "#4ade80" : "#f87171" }}>
                      {log.success ? "OK" : `ERR ${log.statusCode ?? ""}`}
                    </span>
                  </td>
                  <td style={{ padding: "6px 10px", color: "var(--muted)" }}>{log.message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
