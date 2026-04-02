"use client";

import { useState, useEffect } from "react";

type SipAccount = {
  id: string;
  accountIndex: number;
  label: string | null;
  sipUsername: string | null;
  sipPassword: string | null;
  sipServer: string | null;
  displayName: string | null;
  enabled: boolean;
};

type Phone = { id: string; phoneModel: { vendor: string } };

const MAX_ACCOUNTS: Record<string, number> = {
  YEALINK:     16,
  GRANDSTREAM: 6,
  SNOM:        8,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 36, height: 20, borderRadius: 10,
      background: checked ? "var(--accent)" : "#333",
      position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
      }} />
    </div>
  );
}

export function TabSipAccounts({ phone }: { phone: Phone }) {
  const [accounts, setAccounts] = useState<SipAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Record<number, { ok: boolean; text: string }>>({});

  const maxAccounts = MAX_ACCOUNTS[phone.phoneModel.vendor] ?? 6;

  useEffect(() => {
    fetch(`/api/admin/phones/${phone.id}/sip-accounts`)
      .then(r => r.json())
      .then(j => { setAccounts(j.accounts ?? []); setLoading(false); });
  }, [phone.id]);

  function getAccount(idx: number): SipAccount {
    return accounts.find(a => a.accountIndex === idx) ?? {
      id: "", accountIndex: idx, label: null, sipUsername: null,
      sipPassword: null, sipServer: null, displayName: null, enabled: false,
    };
  }

  function updateLocal(idx: number, patch: Partial<SipAccount>) {
    setAccounts(prev => {
      const existing = prev.find(a => a.accountIndex === idx);
      if (existing) return prev.map(a => a.accountIndex === idx ? { ...a, ...patch } : a);
      return [...prev, { id: "", accountIndex: idx, label: null, sipUsername: null, sipPassword: null, sipServer: null, displayName: null, enabled: false, ...patch }];
    });
  }

  async function saveAccount(idx: number) {
    const acc = getAccount(idx);
    setSaving(idx);
    setMsgs(m => ({ ...m, [idx]: { ok: true, text: "" } }));
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/sip-accounts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...acc, accountIndex: idx }),
      });
      const json = await res.json();
      setMsgs(m => ({ ...m, [idx]: json.ok ? { ok: true, text: "Sauvegardé." } : { ok: false, text: json.error ?? "Erreur" } }));
      if (json.ok) setAccounts(prev => prev.map(a => a.accountIndex === idx ? { ...json.account } : a));
    } catch {
      setMsgs(m => ({ ...m, [idx]: { ok: false, text: "Erreur réseau." } }));
    } finally {
      setSaving(null);
    }
  }

  async function deleteAccount(idx: number) {
    if (!confirm(`Supprimer le compte SIP ${idx}?`)) return;
    await fetch(`/api/admin/phones/${phone.id}/sip-accounts`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountIndex: idx }),
    });
    setAccounts(prev => prev.filter(a => a.accountIndex !== idx));
  }

  if (loading) return <div className="card" style={{ padding: 24, color: "var(--muted)" }}>Chargement...</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ fontSize: 13, color: "var(--muted)", padding: "6px 0" }}>
        Comptes SIP supplémentaires (account 1 = onglet Compte principal). Max {maxAccounts} comptes pour {phone.phoneModel.vendor}.
      </div>

      {Array.from({ length: maxAccounts - 1 }, (_, i) => i + 2).map(idx => {
        const acc = getAccount(idx);
        const hasData = !!(acc.sipUsername || acc.sipServer);
        const msg = msgs[idx];

        return (
          <div key={idx} className="card" style={{ padding: 0, overflow: "hidden", opacity: acc.enabled || !hasData ? 1 : 0.6 }}>
            {/* Header */}
            <div style={{ padding: "10px 16px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", background: hasData ? "rgba(255,107,0,0.15)" : "#1a1a1a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: hasData ? "var(--accent)" : "var(--muted)",
              }}>{idx}</div>
              <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                Compte SIP {idx}{acc.label ? ` — ${acc.label}` : ""}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Activé</span>
                <Toggle checked={acc.enabled} onChange={v => updateLocal(idx, { enabled: v })} />
              </div>
              {hasData && (
                <button className="btn btn-ghost btn-sm" style={{ color: "#f87171" }} onClick={() => deleteAccount(idx)}>Supprimer</button>
              )}
            </div>

            {/* Fields */}
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-field">
                <label className="form-label">Étiquette</label>
                <input className="form-input" value={acc.label ?? ""} onChange={e => updateLocal(idx, { label: e.target.value || null })} placeholder={`Bureau ${idx}`} />
              </div>
              <div className="form-field">
                <label className="form-label">Nom d&apos;affichage</label>
                <input className="form-input" value={acc.displayName ?? ""} onChange={e => updateLocal(idx, { displayName: e.target.value || null })} />
              </div>
              <div className="form-field">
                <label className="form-label">Utilisateur SIP</label>
                <input className="form-input" value={acc.sipUsername ?? ""} onChange={e => updateLocal(idx, { sipUsername: e.target.value || null })} placeholder="201" />
              </div>
              <div className="form-field">
                <label className="form-label">Mot de passe SIP</label>
                <input className="form-input" type="password" value={acc.sipPassword ?? ""} onChange={e => updateLocal(idx, { sipPassword: e.target.value || null })} />
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Serveur SIP</label>
                <input className="form-input" value={acc.sipServer ?? ""} onChange={e => updateLocal(idx, { sipServer: e.target.value || null })} placeholder="sip.example.com" />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                {msg && msg.text && (
                  <span style={{ fontSize: 13, color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>
                )}
                <button className="btn btn-primary" onClick={() => saveAccount(idx)} disabled={saving === idx}>
                  {saving === idx ? "Sauvegarde..." : "Sauvegarder"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
