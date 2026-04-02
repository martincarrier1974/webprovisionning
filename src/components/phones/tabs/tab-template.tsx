"use client";

import { useState, useEffect } from "react";

type Rule = { key: string; value: string };
type Template = { id: string; name: string; vendor: string | null; description: string | null; rules: Rule[] };

type Phone = { id: string; phoneModel: { vendor: string } };

export function TabTemplate({ phone }: { phone: Phone }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assigned, setAssigned] = useState<Template | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tRes, aRes] = await Promise.all([
          fetch("/api/admin/templates"),
          fetch(`/api/admin/phones/${phone.id}/template`),
        ]);
        const tJson = await tRes.json();
        const aJson = await aRes.json();
        const filtered = (tJson.templates ?? []).filter((t: Template) =>
          !t.vendor || t.vendor === phone.phoneModel.vendor
        );
        setTemplates(filtered);
        setAssigned(aJson.template ?? null);
        setSelectedId(aJson.template?.id ?? "");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [phone.id, phone.phoneModel.vendor]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/template`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: selectedId || null }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Erreur");
      const tpl = templates.find(t => t.id === selectedId) ?? null;
      setAssigned(tpl);
      setMsg({ ok: true, text: tpl ? `Template "${tpl.name}" appliqué.` : "Template retiré." });
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card" style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>Chargement...</div>;
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>

      {/* ── Sélecteur ────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", background: "#111", borderBottom: "1px solid var(--card-border)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>Template assigné</span>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gap: 16, maxWidth: 560 }}>
          <div className="form-field">
            <label className="form-label">Sélectionner un template</label>
            <select className="form-input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">— Aucun template —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.vendor ? ` (${t.vendor})` : ""}{t.description ? ` — ${t.description}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {msg && <span style={{ fontSize: 13, color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginLeft: "auto" }}>
              {saving ? "Sauvegarde..." : "Appliquer"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Aperçu du template assigné ───────────────────────────────── */}
      {assigned && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#111", borderBottom: "1px solid var(--card-border)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
              Règles du template : {assigned.name}
            </span>
          </div>
          {assigned.rules.length === 0 ? (
            <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>Ce template n&apos;a aucune règle.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0d0d0d", borderBottom: "1px solid var(--card-border)" }}>
                    <th style={{ padding: "8px 16px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Clé</th>
                    <th style={{ padding: "8px 16px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {assigned.rules.map((rule, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td style={{ padding: "6px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--accent)" }}>{rule.key}</td>
                      <td style={{ padding: "6px 16px", fontFamily: "monospace", fontSize: 12 }}>{rule.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {templates.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          Aucun template disponible pour ce vendor.{" "}
          <a href="/dashboard/templates" style={{ color: "var(--accent)" }}>Créer un template →</a>
        </div>
      )}
    </div>
  );
}
