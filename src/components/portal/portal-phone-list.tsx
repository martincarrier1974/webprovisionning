"use client";

import { useState } from "react";

type Phone = {
  id: string;
  macAddress: string;
  label: string | null;
  extensionNumber: string | null;
  status: string;
  lastProvisionedAt: Date | null;
  site: { id: string; name: string } | null;
  phoneModel: { vendor: string; displayName: string };
  firmwareTarget: { version: string } | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: "Actif",      color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  STAGED:   { label: "En attente", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  DISABLED: { label: "Désactivé",  color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  RETIRED:  { label: "Retiré",     color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

export function PortalPhoneList({ phones, clientSlug }: { phones: Phone[]; clientSlug: string }) {
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<Record<string, string>>({});

  const filtered = phones.filter(p =>
    !search ||
    p.label?.toLowerCase().includes(search.toLowerCase()) ||
    p.macAddress.toLowerCase().includes(search.toLowerCase()) ||
    p.extensionNumber?.includes(search) ||
    p.site?.name.toLowerCase().includes(search.toLowerCase())
  );

  async function syncPhone(id: string) {
    setSyncing(id);
    setSyncMsg(m => ({ ...m, [id]: "" }));
    try {
      const res = await fetch(`/api/admin/phones/${id}/resync`, { method: "POST" });
      const json = await res.json();
      setSyncMsg(m => ({ ...m, [id]: json.ok ? "✓ Synchronisé" : `✗ ${json.error}` }));
    } catch {
      setSyncMsg(m => ({ ...m, [id]: "✗ Erreur réseau" }));
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <input
        className="form-input"
        placeholder="Rechercher par nom, poste, MAC, site..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ maxWidth: 400 }}
      />

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
          Aucun téléphone trouvé.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(phone => {
            const status = STATUS_LABELS[phone.status] ?? { label: phone.status, color: "#888", bg: "#1a1a1a" };
            return (
              <div key={phone.id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{phone.label || phone.macAddress}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {phone.phoneModel.displayName}
                    {phone.extensionNumber && ` · Poste #${phone.extensionNumber}`}
                    {phone.site && ` · ${phone.site.name}`}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2, fontFamily: "monospace" }}>{phone.macAddress}</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {phone.firmwareTarget && (
                    <span style={{ fontSize: 11, color: "#4ade80" }}>fw v{phone.firmwareTarget.version}</span>
                  )}
                  {phone.lastProvisionedAt && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      Prov. {new Date(phone.lastProvisionedAt).toLocaleDateString("fr-CA")}
                    </span>
                  )}
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: status.bg, color: status.color, fontWeight: 600 }}>
                    {status.label}
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => syncPhone(phone.id)}
                      disabled={syncing === phone.id}
                    >
                      {syncing === phone.id ? "..." : "⟳ Sync"}
                    </button>
                    {syncMsg[phone.id] && (
                      <span style={{ fontSize: 12, color: syncMsg[phone.id].startsWith("✓") ? "#4ade80" : "#f87171" }}>
                        {syncMsg[phone.id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
