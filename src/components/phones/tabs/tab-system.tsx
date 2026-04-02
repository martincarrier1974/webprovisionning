"use client";

import { useState } from "react";

type Phone = {
  id: string;
  webPassword: string | null;
  adminPassword: string | null;
  provisioningEnabled: boolean;
};

export function TabSystem({ phone }: { phone: Phone }) {
  const [form, setForm] = useState({
    webPassword: phone.webPassword ?? "",
    adminPassword: phone.adminPassword ?? "",
    provisioningEnabled: phone.provisioningEnabled,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
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
      <div className="card-title">Système</div>
      <div className="card-heading" style={{ marginBottom: 16 }}>Paramètres système</div>
      <div className="form-grid" style={{ maxWidth: 560 }}>
        <div className="form-field">
          <label className="form-label">Mot de passe interface web</label>
          <input className="form-input" type="password" value={form.webPassword} onChange={e => setForm(f => ({ ...f, webPassword: e.target.value }))} placeholder="••••••••" />
        </div>
        <div className="form-field">
          <label className="form-label">Mot de passe admin</label>
          <input className="form-input" type="password" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder="••••••••" />
        </div>
        <div className="form-field">
          <label className="form-label">Provisioning activé</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <input
              type="checkbox"
              id="provEnabled"
              checked={form.provisioningEnabled}
              onChange={e => setForm(f => ({ ...f, provisioningEnabled: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <label htmlFor="provEnabled" style={{ fontSize: 14, cursor: "pointer" }}>
              Autoriser ce téléphone à récupérer sa configuration
            </label>
          </div>
        </div>
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
