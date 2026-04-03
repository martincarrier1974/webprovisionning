"use client";

import { useState } from "react";

type Template = { id: string; name: string; vendor?: string | null };

export function SiteTemplateAssign({
  siteId,
  templates,
  assigned: initialAssigned,
}: {
  siteId: string;
  templates: Template[];
  assigned: Template[];
}) {
  const [open, setOpen] = useState(false);
  const [assigned, setAssigned] = useState<Template[]>(initialAssigned);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function toggle(tpl: Template) {
    const isAssigned = assigned.some(a => a.id === tpl.id);
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/templates`, {
        method: isAssigned ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: tpl.id }),
      });
      const json = await res.json();
      if (json.ok) {
        setAssigned(prev =>
          isAssigned ? prev.filter(a => a.id !== tpl.id) : [...prev, tpl]
        );
        setMsg({ ok: true, text: isAssigned ? "Retiré." : "Assigné." });
      } else {
        setMsg({ ok: false, text: json.error ?? "Erreur." });
      }
    } catch {
      setMsg({ ok: false, text: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => { setOpen(o => !o); setMsg(null); }}
        style={{ borderColor: assigned.length > 0 ? "rgba(255,107,0,0.4)" : undefined, color: assigned.length > 0 ? "var(--accent)" : undefined }}
      >
        ⧉ {assigned.length > 0 ? assigned.map(a => a.name).join(", ") : "Templates"}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, zIndex: 200, marginTop: 6,
          background: "var(--card-bg)", border: "1px solid var(--card-border)",
          borderRadius: 10, minWidth: 260, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px", background: "#111", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Templates du site</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>

          {templates.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
              Aucun template. <a href="/dashboard/templates" style={{ color: "var(--accent)" }}>Créer →</a>
            </div>
          ) : (
            <div>
              {templates.map(tpl => {
                const isOn = assigned.some(a => a.id === tpl.id);
                return (
                  <div
                    key={tpl.id}
                    onClick={() => !saving && toggle(tpl)}
                    style={{
                      padding: "9px 14px", cursor: saving ? "wait" : "pointer",
                      display: "flex", alignItems: "center", gap: 10,
                      borderBottom: "1px solid #1a1a1a",
                      background: isOn ? "rgba(255,107,0,0.05)" : "transparent",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isOn ? "var(--accent)" : "var(--card-border)"}`,
                      background: isOn ? "var(--accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isOn && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{tpl.name}</div>
                      {tpl.vendor && <div style={{ fontSize: 11, color: "var(--muted)" }}>{tpl.vendor}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {msg && (
            <div style={{ padding: "8px 14px", fontSize: 12, color: msg.ok ? "#4ade80" : "#f87171", borderTop: "1px solid #1a1a1a" }}>
              {msg.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
