"use client";

import { useState } from "react";

type Rule = { key: string; value: string };
type Template = {
  id: string;
  name: string;
  description: string | null;
  vendor: string | null;
  isDefault: boolean;
  rules: Rule[];
  _count: { sites: number; phones: number };
};

export function TemplatesClient({ templates: initial }: { templates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [selected, setSelected] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Form state pour édition/création
  const [form, setForm] = useState({ name: "", description: "", vendor: "" });
  const [editRules, setEditRules] = useState<Rule[]>([]);

  function openCreate() {
    setSelected(null);
    setForm({ name: "", description: "", vendor: "" });
    setEditRules([{ key: "", value: "" }]);
    setCreating(true);
    setMsg(null);
  }

  function openEdit(t: Template) {
    setSelected(t);
    setForm({ name: t.name, description: t.description ?? "", vendor: t.vendor ?? "" });
    setEditRules(t.rules.length > 0 ? t.rules.map(r => ({ key: r.key, value: r.value })) : [{ key: "", value: "" }]);
    setCreating(false);
    setMsg(null);
  }

  function addRule() {
    setEditRules(r => [...r, { key: "", value: "" }]);
  }

  function removeRule(i: number) {
    setEditRules(r => r.filter((_, idx) => idx !== i));
  }

  function updateRule(i: number, field: "key" | "value", val: string) {
    setEditRules(r => r.map((rule, idx) => idx === i ? { ...rule, [field]: val } : rule));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        vendor: form.vendor || null,
        rules: editRules.filter(r => r.key.trim()),
      };

      if (creating) {
        const res = await fetch("/api/admin/templates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Erreur");
        setTemplates(t => [...t, { ...json.template, _count: { sites: 0, phones: 0 } }]);
        setCreating(false);
        setSelected(json.template);
      } else if (selected) {
        const res = await fetch(`/api/admin/templates/${selected.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Erreur");
        setTemplates(t => t.map(x => x.id === selected.id ? { ...x, ...payload, rules: editRules.filter(r => r.key.trim()) } : x));
      }
      setMsg({ ok: true, text: "Sauvegardé." });
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Supprimer ce template?")) return;
    await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    setTemplates(t => t.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const panelOpen = creating || selected !== null;

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

      {/* ── Liste templates ────────────────────────────────────────── */}
      <div style={{ flex: "0 0 300px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{templates.length} template{templates.length !== 1 ? "s" : ""}</div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Nouveau</button>
        </div>

        {templates.length === 0 && !creating ? (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            Aucun template. Cliquez sur <strong>+ Nouveau</strong> pour commencer.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => openEdit(t)}
                className="card"
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  border: selected?.id === t.id ? "1px solid var(--accent)" : "1px solid var(--card-border)",
                  background: selected?.id === t.id ? "rgba(255,107,0,0.05)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                  {t.vendor && (
                    <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 99, background: "rgba(255,107,0,0.12)", color: "var(--accent)", fontWeight: 600 }}>
                      {t.vendor}
                    </span>
                  )}
                </div>
                {t.description && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{t.description}</div>}
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {t.rules.length} règle{t.rules.length !== 1 ? "s" : ""} · {t._count.sites} site{t._count.sites !== 1 ? "s" : ""} · {t._count.phones} téléphone{t._count.phones !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Éditeur ───────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="card" style={{ flex: 1, padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>
              {creating ? "Nouveau template" : `Modifier : ${selected?.name}`}
            </div>
            {selected && !creating && (
              <button className="btn btn-ghost btn-sm" style={{ color: "#f87171" }} onClick={() => deleteTemplate(selected.id)}>
                Supprimer
              </button>
            )}
          </div>

          <div style={{ padding: 20, display: "grid", gap: 16 }}>
            {/* Infos de base */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div className="form-field">
                <label className="form-label">Nom du template *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Standard bureau" />
              </div>
              <div className="form-field">
                <label className="form-label">Vendor (optionnel)</label>
                <select className="form-input" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}>
                  <option value="">Tous les vendors</option>
                  <option value="YEALINK">Yealink</option>
                  <option value="GRANDSTREAM">Grandstream</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optionnel" />
              </div>
            </div>

            {/* Règles */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Règles</div>
                <button className="btn btn-ghost btn-sm" onClick={addRule}>+ Ajouter une règle</button>
              </div>
              <div style={{ border: "1px solid var(--card-border)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", background: "#111", padding: "7px 12px", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Clé</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Valeur</span>
                  <span />
                </div>
                {editRules.map((rule, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", borderTop: "1px solid #1a1a1a", padding: "6px 8px", gap: 8, alignItems: "center" }}>
                    <input
                      className="form-input"
                      style={{ padding: "4px 8px", fontSize: 12, fontFamily: "monospace" }}
                      value={rule.key}
                      onChange={e => updateRule(i, "key", e.target.value)}
                      placeholder="ex: P52 ou call_waiting.enable"
                    />
                    <input
                      className="form-input"
                      style={{ padding: "4px 8px", fontSize: 12, fontFamily: "monospace" }}
                      value={rule.value}
                      onChange={e => updateRule(i, "value", e.target.value)}
                      placeholder="ex: 1"
                    />
                    <button onClick={() => removeRule(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 16, padding: "0 4px" }}>✕</button>
                  </div>
                ))}
                {editRules.length === 0 && (
                  <div style={{ padding: "16px 12px", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
                    Aucune règle — cliquez sur &quot;+ Ajouter une règle&quot;
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
              {msg && <span style={{ fontSize: 13, color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
              <button className="btn btn-ghost btn-sm" onClick={() => { setCreating(false); setSelected(null); }}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
