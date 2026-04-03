"use client";

import { useState } from "react";

type Phone = { id: string; phoneModel: { vendor: string } };

const SECTIONS = [
  { id: "ldap",     label: "Annuaire LDAP" },
  { id: "phonebook", label: "Répertoire (HTTP)" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 40, height: 22, borderRadius: 11,
      background: checked ? "var(--accent)" : "#333",
      position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
      }} />
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid #1a1a1a", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 240px", minWidth: 160 }}>
        <div style={{ fontSize: 13 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: "10px 20px", background: "#111", borderBottom: "1px solid var(--card-border)" }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>{title}</span>
    </div>
  );
}

type Rules = Record<string, string>;

export function TabContacts({ phone }: { phone: Phone }) {
  const isYealink = phone.phoneModel.vendor === "YEALINK";
  const [activeSection, setActiveSection] = useState("ldap");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [rules, setRules] = useState<Rules>({
    // LDAP
    ldap_enable: "0",
    ldap_server: "",
    ldap_port: "389",
    ldap_base: "dc=example,dc=com",
    ldap_user: "",
    ldap_password: "",
    ldap_name_filter: "(cn=%)",
    ldap_number_filter: "(telephoneNumber=%)",
    ldap_display_name: "cn",
    ldap_number_attr: "telephoneNumber",
    ldap_max_results: "50",
    ldap_tls: "0",
    ldap_version: "3",
    // Phonebook HTTP
    pb_enable: "0",
    pb_server_url: "",
    pb_update_interval: "720",  // 12h
    pb_auto_download: "1",
  });

  function setRule(key: string, value: string) {
    setRules(r => ({ ...r, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const mapped = buildRules(rules, isYealink);
      const res = await fetch(`/api/admin/phones/${phone.id}/rules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules: mapped }),
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
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", minHeight: 400 }}>
        {/* Sidebar */}
        <div style={{ width: 200, borderRight: "1px solid var(--card-border)", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--card-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Contacts</div>
          </div>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13,
              background: activeSection === s.id ? "rgba(255,107,0,0.1)" : "transparent",
              color: activeSection === s.id ? "var(--accent)" : "var(--text)",
              border: "none", borderLeft: activeSection === s.id ? "3px solid var(--accent)" : "3px solid transparent",
              cursor: "pointer", borderBottom: "1px solid #111",
            }}>{s.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {activeSection === "ldap" && (
            <div>
              <SectionHeader title="Annuaire LDAP" />
              <FieldRow label="Activer LDAP">
                <Toggle checked={rules.ldap_enable === "1"} onChange={v => setRule("ldap_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Serveur LDAP" hint="IP ou hostname">
                <input className="form-input" value={rules.ldap_server} onChange={e => setRule("ldap_server", e.target.value)} placeholder="ldap.example.com" />
              </FieldRow>
              <FieldRow label="Port">
                <input className="form-input" value={rules.ldap_port} onChange={e => setRule("ldap_port", e.target.value)} style={{ maxWidth: 90 }} />
              </FieldRow>
              <FieldRow label="Base DN">
                <input className="form-input" value={rules.ldap_base} onChange={e => setRule("ldap_base", e.target.value)} placeholder="dc=company,dc=com" />
              </FieldRow>
              <FieldRow label="Utilisateur (Bind DN)">
                <input className="form-input" value={rules.ldap_user} onChange={e => setRule("ldap_user", e.target.value)} placeholder="cn=admin,dc=company,dc=com" />
              </FieldRow>
              <FieldRow label="Mot de passe">
                <input className="form-input" type="password" value={rules.ldap_password} onChange={e => setRule("ldap_password", e.target.value)} />
              </FieldRow>
              <FieldRow label="Filtre nom" hint="Recherche par nom">
                <input className="form-input" value={rules.ldap_name_filter} onChange={e => setRule("ldap_name_filter", e.target.value)} placeholder="(cn=%)" />
              </FieldRow>
              <FieldRow label="Filtre numéro" hint="Recherche par numéro">
                <input className="form-input" value={rules.ldap_number_filter} onChange={e => setRule("ldap_number_filter", e.target.value)} placeholder="(telephoneNumber=%)" />
              </FieldRow>
              <FieldRow label="Attribut nom affiché">
                <input className="form-input" value={rules.ldap_display_name} onChange={e => setRule("ldap_display_name", e.target.value)} placeholder="cn" />
              </FieldRow>
              <FieldRow label="Attribut numéro">
                <input className="form-input" value={rules.ldap_number_attr} onChange={e => setRule("ldap_number_attr", e.target.value)} placeholder="telephoneNumber" />
              </FieldRow>
              <FieldRow label="Résultats max">
                <input className="form-input" value={rules.ldap_max_results} onChange={e => setRule("ldap_max_results", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="LDAP TLS/SSL">
                <Toggle checked={rules.ldap_tls === "1"} onChange={v => setRule("ldap_tls", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Version LDAP">
                <select className="form-input" value={rules.ldap_version} onChange={e => setRule("ldap_version", e.target.value)} style={{ maxWidth: 100 }}>
                  <option value="2">v2</option>
                  <option value="3">v3</option>
                </select>
              </FieldRow>
            </div>
          )}

          {activeSection === "phonebook" && (
            <div>
              <SectionHeader title="Répertoire HTTP (XML Phonebook)" />
              <FieldRow label="Activer le répertoire distant">
                <Toggle checked={rules.pb_enable === "1"} onChange={v => setRule("pb_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="URL du répertoire" hint="Fichier XML phonebook">
                <input className="form-input" value={rules.pb_server_url} onChange={e => setRule("pb_server_url", e.target.value)} placeholder="https://pbx.example.com/contacts.xml" />
              </FieldRow>
              <FieldRow label="Intervalle de mise à jour (min)">
                <input className="form-input" value={rules.pb_update_interval} onChange={e => setRule("pb_update_interval", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Téléchargement automatique">
                <Toggle checked={rules.pb_auto_download === "1"} onChange={v => setRule("pb_auto_download", v ? "1" : "0")} />
              </FieldRow>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "14px 20px", borderTop: "1px solid var(--card-border)", display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
        {msg && <span style={{ fontSize: 13, color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder & Appliquer"}
        </button>
      </div>
    </div>
  );
}

function buildRules(rules: Rules, isYealink: boolean): { key: string; value: string }[] {
  const map: Record<string, { y: string; g: string }> = {
    ldap_enable:        { y: "ldap.enable",                 g: "P1168" },
    ldap_server:        { y: "ldap.server",                  g: "P1169" },
    ldap_port:          { y: "ldap.port",                    g: "P1170" },
    ldap_base:          { y: "ldap.base",                    g: "P1171" },
    ldap_user:          { y: "ldap.user",                    g: "P1172" },
    ldap_password:      { y: "ldap.password",                g: "P1173" },
    ldap_name_filter:   { y: "ldap.name_filter",             g: "P1174" },
    ldap_number_filter: { y: "ldap.number_filter",           g: "P1175" },
    ldap_display_name:  { y: "ldap.display_name",            g: "P1176" },
    ldap_number_attr:   { y: "ldap.number_attr",             g: "P1177" },
    ldap_max_results:   { y: "ldap.max_hits",                g: "P1178" },
    ldap_tls:           { y: "ldap.tls_mode",                g: "P1179" },
    ldap_version:       { y: "ldap.version",                 g: "P1180" },
    pb_enable:          { y: "remote_phonebook.enable",      g: "P1452" },
    pb_server_url:      { y: "remote_phonebook.data.1.url",  g: "P1453" },
    pb_update_interval: { y: "remote_phonebook.update_time", g: "P1456" },
    pb_auto_download:   { y: "remote_phonebook.flash_mode",  g: "P1457" },
  };
  return Object.entries(rules)
    .filter(([k]) => map[k])
    .map(([k, v]) => ({ key: isYealink ? map[k].y : map[k].g, value: v }));
}
