"use client";

import { useState } from "react";

type Phone = { id: string };

export function TabNetwork({ phone }: { phone: Phone }) {
  const [form, setForm] = useState({
    vlanEnabled: false,
    vlanId: "",
    vlanPriority: "0",
    pcPortEnabled: true,
    ntpServer: "pool.ntp.org",
    ntpInterval: "60",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Network settings are stored as provisioning rules (key/value) for this phone
  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const rules = [
        { key: "network.vlan.enabled", value: form.vlanEnabled ? "1" : "0" },
        { key: "network.vlan.id", value: form.vlanId },
        { key: "network.vlan.priority", value: form.vlanPriority },
        { key: "network.pc_port.enabled", value: form.pcPortEnabled ? "1" : "0" },
        { key: "local_time.ntp_server1", value: form.ntpServer },
        { key: "local_time.interval", value: form.ntpInterval },
      ];

      const res = await fetch(`/api/admin/phones/${phone.id}/rules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules }),
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
      <div className="card-title">Réseau</div>
      <div className="card-heading" style={{ marginBottom: 16 }}>Paramètres réseau</div>
      <div className="form-grid" style={{ maxWidth: 560 }}>

        <div style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: 16, marginBottom: 4 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>VLAN</div>
          <div className="form-field" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                id="vlanEnabled"
                checked={form.vlanEnabled}
                onChange={e => setForm(f => ({ ...f, vlanEnabled: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
              />
              <label htmlFor="vlanEnabled" style={{ fontSize: 14, cursor: "pointer" }}>Activer le VLAN</label>
            </div>
          </div>
          {form.vlanEnabled && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-field">
                <label className="form-label">ID VLAN</label>
                <input className="form-input" value={form.vlanId} onChange={e => setForm(f => ({ ...f, vlanId: e.target.value }))} placeholder="ex: 100" />
              </div>
              <div className="form-field">
                <label className="form-label">Priorité VLAN (0-7)</label>
                <select className="form-input" value={form.vlanPriority} onChange={e => setForm(f => ({ ...f, vlanPriority: e.target.value }))}>
                  {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={String(n)}>{n}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: 16, marginBottom: 4 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Port PC</div>
          <div className="form-field">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                id="pcPort"
                checked={form.pcPortEnabled}
                onChange={e => setForm(f => ({ ...f, pcPortEnabled: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
              />
              <label htmlFor="pcPort" style={{ fontSize: 14, cursor: "pointer" }}>Port PC activé (bridge)</label>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>NTP</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-field">
              <label className="form-label">Serveur NTP</label>
              <input className="form-input" value={form.ntpServer} onChange={e => setForm(f => ({ ...f, ntpServer: e.target.value }))} placeholder="pool.ntp.org" />
            </div>
            <div className="form-field">
              <label className="form-label">Intervalle (min)</label>
              <input className="form-input" type="number" value={form.ntpInterval} onChange={e => setForm(f => ({ ...f, ntpInterval: e.target.value }))} placeholder="60" />
            </div>
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
