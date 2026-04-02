"use client";

import { useState } from "react";

type Phone = {
  id: string;
  label: string | null;
  extensionNumber: string | null;
  sipUsername: string | null;
  sipPassword: string | null;
  sipServer: string | null;
  status: string;
};

export function TabSip({ phone }: { phone: Phone }) {
  const [form, setForm] = useState({
    label: phone.label ?? "",
    extensionNumber: phone.extensionNumber ?? "",
    sipUsername: phone.sipUsername ?? "",
    sipPassword: phone.sipPassword ?? "",
    sipServer: phone.sipServer ?? "",
    status: phone.status,
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
      <div className="card-title">Compte SIP</div>
      <div className="card-heading" style={{ marginBottom: 16 }}>Paramètres SIP</div>
      <div className="form-grid" style={{ maxWidth: 560 }}>
        <div className="form-field">
          <label className="form-label">Nom / Label</label>
          <input className="form-input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="ex: Bureau réception" />
        </div>
        <div className="form-field">
          <label className="form-label">Numéro de poste</label>
          <input className="form-input" value={form.extensionNumber} onChange={e => setForm(f => ({ ...f, extensionNumber: e.target.value }))} placeholder="ex: 1001" />
        </div>
        <div className="form-field">
          <label className="form-label">Serveur SIP</label>
          <input className="form-input" value={form.sipServer} onChange={e => setForm(f => ({ ...f, sipServer: e.target.value }))} placeholder="ex: sip.bztelecom.ca" />
        </div>
        <div className="form-field">
          <label className="form-label">Nom d'utilisateur SIP</label>
          <input className="form-input" value={form.sipUsername} onChange={e => setForm(f => ({ ...f, sipUsername: e.target.value }))} placeholder="ex: 1001" />
        </div>
        <div className="form-field">
          <label className="form-label">Mot de passe SIP</label>
          <input className="form-input" type="password" value={form.sipPassword} onChange={e => setForm(f => ({ ...f, sipPassword: e.target.value }))} placeholder="••••••••" />
        </div>
        <div className="form-field">
          <label className="form-label">Statut</label>
          <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="STAGED">En attente</option>
            <option value="ACTIVE">Actif</option>
            <option value="DISABLED">Désactivé</option>
            <option value="RETIRED">Retiré</option>
          </select>
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
