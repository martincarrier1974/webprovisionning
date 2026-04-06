"use client";

import { useState } from "react";

type Phone = {
  id: string;
  webPassword: string | null;
  adminPassword: string | null;
  provisioningEnabled: boolean;
  phoneModel: { vendor: string };
};

const SECTIONS = [
  { id: "passwords",  label: "Mots de passe" },
  { id: "display",    label: "LCD & LED" },
  { id: "time",       label: "Heure & Langue" },
  { id: "provision",  label: "Provisioning" },
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
      <div style={{ flex: "0 0 260px", minWidth: 180 }}>
        <div style={{ fontSize: 13, color: "var(--text)" }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: "12px 20px", background: "#111", borderBottom: "1px solid var(--card-border)" }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>{title}</span>
    </div>
  );
}

type Rules = Record<string, string>;

export function TabSystem({ phone }: { phone: Phone }) {
  const isYealink = phone.phoneModel.vendor === "YEALINK";

  const [form, setForm] = useState({
    webPassword: phone.webPassword ?? "",
    adminPassword: phone.adminPassword ?? "",
    provisioningEnabled: phone.provisioningEnabled,
  });

  const [rules, setRules] = useState<Rules>({
    // Display
    backlight_active_time: "1",
    backlight_active_level: "100",
    backlight_idle_level: "60",
    mwi_enable: "1",
    blf_led_mode: "0",
    show_date_time: "1",
    screensaver: "0",
    screensaver_timeout: "3",
    // Time
    ntp_server: "pool.ntp.org",
    ntp_interval: "1440",
    time_format: "0",
    date_format: "2",
    timezone: "-5",
    allow_dhcp_tz: "0",
    // Language
    language: "fr",
    auto_lang_download: "1",
  });

  function setRule(key: string, value: string) {
    setRules(r => ({ ...r, [key]: value }));
  }

  const [activeSection, setActiveSection] = useState("passwords");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      // Passwords + provisioning flag
      const sipRes = await fetch(`/api/admin/phones/${phone.id}/update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const sipJson = await sipRes.json();
      if (!sipJson.ok) throw new Error(sipJson.error ?? "Erreur");

      // Rules
      const mappedRules = buildRules(rules, isYealink);
      const rulesRes = await fetch(`/api/admin/phones/${phone.id}/rules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules: mappedRules }),
      });
      const rulesJson = (await rulesRes.json()) as { ok?: boolean; error?: string };
      if (!rulesRes.ok || !rulesJson.ok) {
        throw new Error(rulesJson.error ?? `Règles : erreur ${rulesRes.status}`);
      }

      setMsg({ ok: true, text: "Sauvegardé & appliqué." });
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erreur." });
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>System Settings</div>
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
        <div style={{ flex: 1, overflow: "auto" }}>

          {activeSection === "passwords" && (
            <div>
              <SectionHeader title="Mots de passe" />
              <FieldRow label="Mot de passe interface web">
                <input className="form-input" type="password" value={form.webPassword} onChange={e => setForm(f => ({ ...f, webPassword: e.target.value }))} placeholder="••••••••" />
              </FieldRow>
              <FieldRow label="Mot de passe admin">
                <input className="form-input" type="password" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder="••••••••" />
              </FieldRow>
              <FieldRow label="Provisioning activé" hint="Autoriser ce téléphone à récupérer sa configuration">
                <Toggle checked={form.provisioningEnabled} onChange={v => setForm(f => ({ ...f, provisioningEnabled: v }))} />
              </FieldRow>
            </div>
          )}

          {activeSection === "display" && (
            <div>
              <SectionHeader title="LCD & LED" />
              <FieldRow label="Active Backlight Timeout (min)">
                <input className="form-input" value={rules.backlight_active_time} onChange={e => setRule("backlight_active_time", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="LCD Brightness (Active %)">
                <input className="form-input" value={rules.backlight_active_level} onChange={e => setRule("backlight_active_level", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="LCD Brightness (Idle %)">
                <input className="form-input" value={rules.backlight_idle_level} onChange={e => setRule("backlight_idle_level", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="Enable MWI Indicator">
                <Toggle checked={rules.mwi_enable === "1"} onChange={v => setRule("mwi_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="BLF LED Pattern">
                <select className="form-input" value={rules.blf_led_mode} onChange={e => setRule("blf_led_mode", e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="0">Default</option>
                  <option value="1">BLF LED Mode 1</option>
                  <option value="2">BLF LED Mode 2</option>
                </select>
              </FieldRow>
              <FieldRow label="Show Date and Time">
                <Toggle checked={rules.show_date_time === "1"} onChange={v => setRule("show_date_time", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Screensaver">
                <Toggle checked={rules.screensaver === "1"} onChange={v => setRule("screensaver", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Screensaver Timeout (min)">
                <input className="form-input" value={rules.screensaver_timeout} onChange={e => setRule("screensaver_timeout", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
            </div>
          )}

          {activeSection === "time" && (
            <div>
              <SectionHeader title="Heure & Langue" />
              <FieldRow label="Serveur NTP">
                <input className="form-input" value={rules.ntp_server} onChange={e => setRule("ntp_server", e.target.value)} placeholder="pool.ntp.org" />
              </FieldRow>
              <FieldRow label="NTP Update Interval (min)">
                <input className="form-input" value={rules.ntp_interval} onChange={e => setRule("ntp_interval", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Time Format">
                <select className="form-input" value={rules.time_format} onChange={e => setRule("time_format", e.target.value)} style={{ maxWidth: 140 }}>
                  <option value="0">12 heures</option>
                  <option value="1">24 heures</option>
                </select>
              </FieldRow>
              <FieldRow label="Date Format">
                <select className="form-input" value={rules.date_format} onChange={e => setRule("date_format", e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="0">MM/DD/YYYY</option>
                  <option value="1">DD/MM/YYYY</option>
                  <option value="2">YYYY-MM-DD</option>
                </select>
              </FieldRow>
              <FieldRow label="Timezone Offset">
                <select className="form-input" value={rules.timezone} onChange={e => setRule("timezone", e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="-5">GMT-05:00 (EST)</option>
                  <option value="-4">GMT-04:00 (EDT)</option>
                  <option value="-6">GMT-06:00 (CST)</option>
                  <option value="-7">GMT-07:00 (MST)</option>
                  <option value="-8">GMT-08:00 (PST)</option>
                </select>
              </FieldRow>
              <FieldRow label="Allow DHCP Option 2 Override Timezone">
                <Toggle checked={rules.allow_dhcp_tz === "1"} onChange={v => setRule("allow_dhcp_tz", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Display Language">
                <select className="form-input" value={rules.language} onChange={e => setRule("language", e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </FieldRow>
              <FieldRow label="Auto Language Download">
                <Toggle checked={rules.auto_lang_download === "1"} onChange={v => setRule("auto_lang_download", v ? "1" : "0")} />
              </FieldRow>
            </div>
          )}

          {activeSection === "provision" && (
            <div>
              <SectionHeader title="Provisioning" />
              <div style={{ padding: 20, color: "var(--muted)", fontSize: 13 }}>
                Les paramètres de provisioning détaillés se trouvent dans l&apos;onglet <strong style={{ color: "var(--accent)" }}>Maintenance</strong>.
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 20px", borderTop: "1px solid var(--card-border)", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Sauvegarde..." : "Sauvegarder & Appliquer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildRules(rules: Rules, isYealink: boolean): { key: string; value: string }[] {
  const map: Record<string, { y: string; g: string }> = {
    backlight_active_time:  { y: "backlight.active_time",             g: "P96" },
    backlight_active_level: { y: "backlight.active_level",            g: "P324" },
    backlight_idle_level:   { y: "backlight.inactive_level",          g: "P325" },
    mwi_enable:             { y: "phone_setting.mwi_indicator.enable",g: "P195" },
    blf_led_mode:           { y: "features.blf_led_mode",             g: "P197" },
    show_date_time:         { y: "phone_setting.show_date_time",      g: "P1305" },
    screensaver:            { y: "phone_setting.screen_saver.enable", g: "P199" },
    screensaver_timeout:    { y: "phone_setting.screen_saver.time",   g: "P200" },
    ntp_server:             { y: "local_time.ntp_server1",            g: "P212" },
    ntp_interval:           { y: "local_time.interval",               g: "P213" },
    time_format:            { y: "local_time.time_format",            g: "P315" },
    date_format:            { y: "local_time.date_format",            g: "P314" },
    timezone:               { y: "local_time.time_zone",              g: "P64" },
    allow_dhcp_tz:          { y: "local_time.dhcp_time",              g: "P75" },
    language:               { y: "lang.gui",                          g: "P331" },
    auto_lang_download:     { y: "lang.input.extended.char",          g: "P1351" },
  };

  return Object.entries(rules)
    .filter(([k]) => map[k])
    // Grandstream : ne pas mapper le serveur NTP sur P212 (P212 = « Upgrade via », pas NTP).
    .filter(([k]) => isYealink || k !== "ntp_server")
    .map(([k, v]) => ({
      key: isYealink ? map[k].y : map[k].g,
      value: k === "language" && isYealink ? (v === "fr" ? "French" : "English") : v,
    }));
}
