"use client";

import { useState } from "react";

type Key = {
  id?: string;
  keyIndex: number;
  account: string;
  description: string;
  mode: string;
  locked: boolean;
  value: string;
};

type Phone = { id: string; phoneModel: { vendor: string; lineCapacity?: number | null } };

const MODES = [
  { value: "DEFAULT", label: "Défaut" },
  { value: "BLF", label: "BLF (supervision)" },
  { value: "SPEED_DIAL", label: "Numérotation rapide" },
  { value: "CALL_PARK", label: "Parcage d'appel" },
  { value: "INTERCOM", label: "Interphone" },
  { value: "FORWARD", label: "Renvoi" },
  { value: "DND", label: "Ne pas déranger" },
  { value: "RECORD", label: "Enregistrement" },
  { value: "NONE", label: "Aucun" },
];

function emptyKey(index: number): Key {
  return { keyIndex: index, account: "Account1", description: "", mode: "DEFAULT", locked: false, value: "" };
}

type Props = {
  phone: Phone;
  initialKeys: Key[];
};

export function TabKeys({ phone, initialKeys }: Props) {
  const capacity = phone.phoneModel.lineCapacity ?? 6;
  const [enabled, setEnabled] = useState(initialKeys.length > 0);
  const [keys, setKeys] = useState<Key[]>(() => {
    const filled = [...initialKeys];
    for (let i = filled.length; i < capacity; i++) filled.push(emptyKey(i + 1));
    return filled.sort((a, b) => a.keyIndex - b.keyIndex);
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function updateKey(index: number, field: keyof Key, val: string | boolean) {
    setKeys(prev => prev.map((k, i) => i === index ? { ...k, [field]: val } : k));
  }

  function selectAll() {
    setKeys(prev => prev.map(k => ({ ...k, mode: "BLF" })));
  }

  function resetAll() {
    setKeys(Array.from({ length: capacity }, (_, i) => emptyKey(i + 1)));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/keys`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled, keys }),
      });
      const json = await res.json();
      setMsg(json.ok ? { ok: true, text: "Sauvegardé & appliqué." } : { ok: false, text: json.error ?? "Erreur." });
    } catch {
      setMsg({ ok: false, text: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="card-title" style={{ marginBottom: 2 }}>Touches programmables</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {phone.phoneModel.vendor} · {capacity} touches configurables
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            id="keysEnabled"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
          />
          <label htmlFor="keysEnabled" style={{ fontSize: 14, cursor: "pointer" }}>Activer les touches virtuelles</label>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#111", borderBottom: "1px solid var(--card-border)" }}>
              {["#", "Compte", "Description", "Mode", "Verrouillé", "Valeur"].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key, i) => (
              <tr key={key.keyIndex} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                <td style={{ padding: "6px 12px", color: "var(--muted)", fontWeight: 600 }}>{key.keyIndex}</td>
                <td style={{ padding: "6px 8px" }}>
                  <select className="form-input" style={{ padding: "4px 8px", fontSize: 12 }} value={key.account} onChange={e => updateKey(i, "account", e.target.value)}>
                    {Array.from({ length: 6 }, (_, n) => (
                      <option key={n} value={`Account${n + 1}`}>Compte {n + 1}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input className="form-input" style={{ padding: "4px 8px", fontSize: 12 }} value={key.description} onChange={e => updateKey(i, "description", e.target.value)} placeholder="Description" />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <select className="form-input" style={{ padding: "4px 8px", fontSize: 12 }} value={key.mode} onChange={e => updateKey(i, "mode", e.target.value)}>
                    {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </td>
                <td style={{ padding: "6px 12px", textAlign: "center" }}>
                  <input type="checkbox" checked={key.locked} onChange={e => updateKey(i, "locked", e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input className="form-input" style={{ padding: "4px 8px", fontSize: 12 }} value={key.value} onChange={e => updateKey(i, "value", e.target.value)} placeholder="ex: 1002" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer buttons */}
      <div style={{ padding: "14px 20px", borderTop: "1px solid var(--card-border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={selectAll}>Sélectionner tout (BLF)</button>
        <button className="btn btn-ghost btn-sm" onClick={resetAll}>Réinitialiser</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
          <a href={`/dashboard/phones/${phone.id}`} className="btn btn-ghost btn-sm">Retour</a>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Sauvegarde..." : "Sauvegarder & Appliquer"}
          </button>
        </div>
      </div>
    </div>
  );
}
