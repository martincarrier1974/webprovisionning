"use client";

import { useState } from "react";
import Link from "next/link";

import { translateStatus } from "@/lib/i18n/status";

type Phone = {
  id: string;
  macAddress: string;
  label: string | null;
  extensionNumber: string | null;
  sipUsername: string | null;
  sipServer: string | null;
  status: string;
  lastProvisionedAt: Date | null;
  provisioningEnabled: boolean;
  client: { id: string; name: string };
  site: { id: string; name: string } | null;
  phoneModel: { id: string; vendor: string; modelCode: string; displayName: string };
  firmwareTarget: { id: string; version: string } | null;
};

type BulkResult = { id: string; ok: boolean; error?: string };

export function PhonesTable({ phones }: { phones: Phone[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState<"config" | "firmware" | "delete" | null>(null);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const allIds = phones.map(p => p.id);
  const allChecked = selected.size === allIds.length && allIds.length > 0;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function deleteBulk() {
    if (selected.size === 0) return;
    if (!confirm(`Supprimer ${selected.size} téléphone${selected.size > 1 ? "s" : ""} ? Cette action est irréversible.`)) return;
    setRunning("delete");
    setResults([]);
    setShowResults(true);

    const ids = [...selected];
    const res: BulkResult[] = [];

    for (const id of ids) {
      try {
        const r = await fetch(`/api/admin/phones/${id}`, { method: "DELETE" });
        const json = await r.json();
        res.push({ id, ok: json.ok, error: json.error });
      } catch {
        res.push({ id, ok: false, error: "Erreur réseau" });
      }
      setResults([...res]);
    }

    // Remove deleted phones from the list
    const deleted = new Set(res.filter(r => r.ok).map(r => r.id));
    setSelected(new Set());
    // Refresh page to reflect deletions
    if (deleted.size > 0) window.location.reload();
    setRunning(null);
  }

  async function runBulk(action: "config" | "firmware") {
    if (selected.size === 0) {
      setShowResults(true);
      setResults([{ id: "", ok: false, error: "Sélectionnez au moins un téléphone (case à cocher)." }]);
      return;
    }
    setRunning(action);
    setResults([]);
    setShowResults(true);

    const ids = [...selected];
    const endpoint = action === "config" ? "resync" : "firmware-push";
    const res: BulkResult[] = [];

    // Séquentiel pour ne pas surcharger
    for (const id of ids) {
      try {
        const r = await fetch(`/api/admin/phones/${id}/${endpoint}`, { method: "POST" });
        const json = await r.json();
        res.push({ id, ok: json.ok, error: json.error });
      } catch {
        res.push({ id, ok: false, error: "Erreur réseau" });
      }
      setResults([...res]);
    }

    setRunning(null);
  }

  const phoneMap = Object.fromEntries(phones.map(p => [p.id, p]));
  const okCount = results.filter(r => r.ok).length;
  const errCount = results.filter(r => !r.ok).length;

  if (phones.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun téléphone trouvé.</p>
        <a href="/dashboard/phones/new" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
          + Ajouter un téléphone
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Barre d'actions ────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
        background: selected.size > 0 ? "rgba(255,107,0,0.08)" : "#111",
        border: `1px solid ${selected.size > 0 ? "rgba(255,107,0,0.3)" : "var(--card-border)"}`,
        borderRadius: 8, flexWrap: "wrap", transition: "background 0.2s, border-color 0.2s",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: selected.size > 0 ? "var(--accent)" : "var(--muted)" }}>
          {selected.size > 0
            ? `${selected.size} téléphone${selected.size > 1 ? "s" : ""} sélectionné${selected.size > 1 ? "s" : ""}`
            : "Aucune sélection"}
        </span>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => runBulk("config")}
            disabled={running !== null || selected.size === 0}
          >
            {running === "config" ? `⟳ Config en cours… (${results.length}/${selected.size})` : "⟳ Pousser config"}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => runBulk("firmware")}
            disabled={running !== null || selected.size === 0}
            style={{ borderColor: "rgba(255,107,0,0.4)", color: "var(--accent)" }}
          >
            {running === "firmware" ? `↑ Firmware en cours… (${results.length}/${selected.size})` : "↑ Pousser firmware"}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={deleteBulk}
            disabled={running !== null || selected.size === 0}
            style={{ borderColor: "rgba(248,113,113,0.4)", color: "#f87171" }}
          >
            {running === "delete" ? `✕ Suppression… (${results.length}/${selected.size})` : "✕ Supprimer"}
          </button>
          {selected.size > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Désélectionner</button>
          )}
        </div>
      </div>

      {/* ── Résultats bulk ─────────────────────────────────────── */}
      {showResults && results.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
              Résultats
            </span>
            <span style={{ fontSize: 12, color: "#4ade80" }}>✓ {okCount} OK</span>
            {errCount > 0 && <span style={{ fontSize: 12, color: "#f87171" }}>✗ {errCount} erreur{errCount > 1 ? "s" : ""}</span>}
            {running === null && (
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setShowResults(false)}>✕</button>
            )}
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {results.map((r, i) => {
              const p = r.id ? phoneMap[r.id] : undefined;
              return (
                <div key={r.id || `hint-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", borderBottom: "1px solid #1a1a1a", fontSize: 13 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)", minWidth: 140 }}>{p?.macAddress ?? r.id}</span>
                  <span style={{ flex: 1 }}>{p?.label ?? "—"}</span>
                  {r.ok
                    ? <span style={{ color: "#4ade80", fontSize: 12 }}>✓ OK</span>
                    : <span style={{ color: "#f87171", fontSize: 12 }}>✗ {r.error ?? "Erreur"}</span>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tableau ────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#111", borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "10px 14px", width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                  />
                </th>
                <Th>Adresse MAC</Th>
                <Th>Nom / Poste</Th>
                <Th>Modèle</Th>
                <Th>Serveur SIP</Th>
                <Th>Firmware cible</Th>
                <Th>Site</Th>
                <Th>Client</Th>
                <Th>Dernier provisionning</Th>
                <Th>Statut</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {phones.map((phone, i) => {
                const isSelected = selected.has(phone.id);
                return (
                  <tr
                    key={phone.id}
                    style={{
                      borderBottom: "1px solid #1a1a1a",
                      background: isSelected
                        ? "rgba(255,107,0,0.05)"
                        : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      transition: "background 0.1s",
                    }}
                  >
                    <td style={{ padding: "10px 14px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(phone.id)}
                        style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                      />
                    </td>
                    <Td>
                      <span style={{ fontFamily: "monospace", color: "#f97316", fontSize: 12 }}>
                        {phone.macAddress}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{phone.label || "—"}</div>
                      {phone.extensionNumber && (
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>#{phone.extensionNumber}</div>
                      )}
                    </Td>
                    <Td>
                      <div>{phone.phoneModel.displayName}</div>
                      <div style={{ color: "var(--muted)", fontSize: 11 }}>{phone.phoneModel.vendor}</div>
                    </Td>
                    <Td>
                      <div style={{ color: "var(--muted)" }}>{phone.sipServer || "—"}</div>
                      {phone.sipUsername && (
                        <div style={{ fontSize: 11, color: "#666" }}>{phone.sipUsername}</div>
                      )}
                    </Td>
                    <Td>
                      {phone.firmwareTarget ? (
                        <span style={{ color: "#4ade80", fontSize: 12 }}>v{phone.firmwareTarget.version}</span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </Td>
                    <Td>{phone.site?.name || <span style={{ color: "var(--muted)" }}>—</span>}</Td>
                    <Td style={{ color: "var(--muted)" }}>{phone.client.name}</Td>
                    <Td>
                      {phone.lastProvisionedAt ? (
                        <div>
                          <div style={{ fontSize: 12 }}>
                            {new Date(phone.lastProvisionedAt).toLocaleDateString("fr-CA")}
                          </div>
                          <div style={{ color: "var(--muted)", fontSize: 11 }}>
                            {new Date(phone.lastProvisionedAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>Jamais</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={phone.status} />
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/dashboard/phones/${phone.id}`} className="btn btn-ghost btn-sm">
                          Configurer
                        </Link>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--card-border)", color: "var(--muted)", fontSize: 12, display: "flex", gap: 12 }}>
          <span>{phones.length} appareil(s)</span>
          {selected.size > 0 && <span style={{ color: "var(--accent)" }}>{selected.size} sélectionné(s)</span>}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "10px 14px", verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    STAGED: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
    DISABLED: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    RETIRED: { bg: "rgba(100,116,139,0.12)", color: "#64748b" },
  };
  const style = colorMap[status] ?? { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" };
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: style.bg, color: style.color, fontWeight: 600, whiteSpace: "nowrap" }}>
      {translateStatus(status)}
    </span>
  );
}
