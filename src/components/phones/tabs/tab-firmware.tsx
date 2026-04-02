"use client";

import { useState } from "react";

type Phone = { id: string; firmwareTarget: { id: string; version: string } | null };
type Firmware = { id: string; version: string; status: string; isDefault: boolean };

export function TabFirmware({ phone, firmwares }: { phone: Phone; firmwares: Firmware[] }) {
  const [firmwareId, setFirmwareId] = useState(phone.firmwareTarget?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firmwareTargetId: firmwareId || null }),
      });
      const json = await res.json();
      setMsg(json.ok ? { ok: true, text: "Sauvegardé." } : { ok: false, text: json.error ?? "Erreur." });
    } catch {
      setMsg({ ok: false, text: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Firmware</div>
      <div className="card-heading" style={{ marginBottom: 16 }}>Version cible</div>
      <div className="form-grid" style={{ maxWidth: 560 }}>
        <div className="form-field">
          <label className="form-label">Firmware assigné</label>
          <select className="form-input" value={firmwareId} onChange={e => setFirmwareId(e.target.value)}>
            <option value="">— Aucun firmware assigné —</option>
            {firmwares.map(fw => (
              <option key={fw.id} value={fw.id}>
                v{fw.version} — {fw.status === "ACTIVE" ? "Actif" : fw.status === "DRAFT" ? "Brouillon" : "Archivé"}
                {fw.isDefault ? " ★" : ""}
              </option>
            ))}
          </select>
        </div>
        {firmwares.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Aucun firmware disponible pour ce modèle.
            <a href="/dashboard/firmwares" style={{ color: "var(--accent)", marginLeft: 6 }}>Ajouter un firmware →</a>
          </p>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </button>
          {msg && <span style={{ fontSize: 13, color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
        </div>
      </div>
    </div>
  );
}
