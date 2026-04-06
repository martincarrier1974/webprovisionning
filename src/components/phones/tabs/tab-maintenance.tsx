"use client";

import { useState } from "react";

type Phone = {
  id: string;
  phoneModel: { vendor: string };
};

const SECTIONS = [
  { id: "provision", label: "Provisioning" },
  { id: "firmware",  label: "Firmware Upgrade" },
  { id: "syslog",   label: "Syslog" },
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

export function TabMaintenance({ phone }: { phone: Phone }) {
  const isYealink = phone.phoneModel.vendor === "YEALINK";

  const [rules, setRules] = useState<Rules>({
    // Provisioning
    auto_provision: "1",
    provision_mode: "1",           // 1=always check, 2=on change
    provision_interval: "10080",   // minutes (hebdo)
    provision_day: "1",            // Monday
    provision_hour: "1",
    allow_dhcp_option_66: "1",
    sip_notify_auth: "1",
    // Firmware
    firmware_upgrade: "3",         // 3=always check
    firmware_upgrade_interval: "10080",
    firmware_upgrade_day: "1",
    firmware_upgrade_hour: "1",
    // Syslog
    syslog_enable: "0",
    syslog_server: "",
    syslog_level: "3",
  });

  function setRule(key: string, value: string) {
    setRules(r => ({ ...r, [key]: value }));
  }

  const [activeSection, setActiveSection] = useState("provision");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const mappedRules = buildRules(rules, isYealink);
      const res = await fetch(`/api/admin/phones/${phone.id}/rules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules: mappedRules }),
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
      <div style={{ display: "flex", minHeight: 400 }}>
        {/* Sidebar */}
        <div style={{ width: 200, borderRight: "1px solid var(--card-border)", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--card-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Maintenance</div>
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

          {activeSection === "provision" && (
            <div>
              <SectionHeader title="Auto Provision" />
              <FieldRow label="Auto Provision">
                <Toggle checked={rules.auto_provision === "1"} onChange={v => setRule("auto_provision", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Firmware Upgrade and Provisioning">
                <select className="form-input" value={rules.provision_mode} onChange={e => setRule("provision_mode", e.target.value)} style={{ maxWidth: 240 }}>
                  <option value="0">No (manual only)</option>
                  <option value="1">Always Check for New Config</option>
                  <option value="2">Check New Config Only When Rebooted</option>
                </select>
              </FieldRow>
              <FieldRow label="Automatic Upgrade Check Interval (min)">
                <input className="form-input" value={rules.provision_interval} onChange={e => setRule("provision_interval", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Day of the Week (0=Sun, 1=Mon...)">
                <select className="form-input" value={rules.provision_day} onChange={e => setRule("provision_day", e.target.value)} style={{ maxWidth: 160 }}>
                  {["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"].map((d, i) => (
                    <option key={i} value={String(i)}>{d}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Start Hour of the Day (0-23)">
                <input className="form-input" value={rules.provision_hour} onChange={e => setRule("provision_hour", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="Allow DHCP Option 43/66 to Override Server">
                <Toggle checked={rules.allow_dhcp_option_66 === "1"} onChange={v => setRule("allow_dhcp_option_66", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable SIP NOTIFY Authentication">
                <Toggle checked={rules.sip_notify_auth === "1"} onChange={v => setRule("sip_notify_auth", v ? "1" : "0")} />
              </FieldRow>
            </div>
          )}

          {activeSection === "firmware" && (
            <div>
              <SectionHeader title="Firmware Upgrade" />
              <FieldRow label="Automatic Upgrade">
                <select className="form-input" value={rules.firmware_upgrade} onChange={e => setRule("firmware_upgrade", e.target.value)} style={{ maxWidth: 240 }}>
                  <option value="0">No</option>
                  <option value="1">Yes — Check Interval</option>
                  <option value="2">Yes — Check Day/Hour</option>
                  <option value="3">Always Check for New Firmware</option>
                </select>
              </FieldRow>
              <FieldRow label="Upgrade Check Interval (min)">
                <input className="form-input" value={rules.firmware_upgrade_interval} onChange={e => setRule("firmware_upgrade_interval", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Day of the Week">
                <select className="form-input" value={rules.firmware_upgrade_day} onChange={e => setRule("firmware_upgrade_day", e.target.value)} style={{ maxWidth: 160 }}>
                  {["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"].map((d, i) => (
                    <option key={i} value={String(i)}>{d}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Start Hour (0-23)">
                <input className="form-input" value={rules.firmware_upgrade_hour} onChange={e => setRule("firmware_upgrade_hour", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
            </div>
          )}

          {activeSection === "syslog" && (
            <div>
              <SectionHeader title="Syslog" />
              <FieldRow label="Enable Syslog">
                <Toggle checked={rules.syslog_enable === "1"} onChange={v => setRule("syslog_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Syslog Server">
                <input className="form-input" value={rules.syslog_server} onChange={e => setRule("syslog_server", e.target.value)} placeholder="192.168.1.100" />
              </FieldRow>
              <FieldRow label="Syslog Level">
                <select className="form-input" value={rules.syslog_level} onChange={e => setRule("syslog_level", e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="0">None</option>
                  <option value="1">Debug</option>
                  <option value="2">Info</option>
                  <option value="3">Warning</option>
                  <option value="4">Error</option>
                </select>
              </FieldRow>
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
    // Grandstream P-codes ref: GXP21xx Admin Guide
    auto_provision:           { y: "auto_provision.repeat.enable",       g: "P214" },  // 1=enable periodic check
    provision_mode:           { y: "auto_provision.check.new_config",    g: "P144" },  // 0=no 1=always 2=on reboot
    provision_interval:       { y: "auto_provision.repeat.minutes",      g: "P146" },  // interval in minutes
    provision_day:            { y: "auto_provision.check.weekday",       g: "P147" },  // 0=Sun…6=Sat
    provision_hour:           { y: "auto_provision.check.time",          g: "P148" },  // hour 0-23
    allow_dhcp_option_66:     { y: "auto_provision.dhcp_option.enable",  g: "P145" },  // 0=ignore DHCP 43/66
    sip_notify_auth:          { y: "auto_provision.notify.enable",       g: "P1375" }, // SIP NOTIFY auth
    firmware_upgrade:         { y: "auto_provision.firmware.enable",     g: "P194" },  // 0=no 1=check interval 3=always
    firmware_upgrade_interval:{ y: "auto_provision.firmware.interval",   g: "P151" },
    firmware_upgrade_day:     { y: "auto_provision.firmware.weekday",    g: "P152" },
    firmware_upgrade_hour:    { y: "auto_provision.firmware.time",       g: "P153" },
    syslog_enable:            { y: "syslog.enable",                      g: "P518" },
    syslog_server:            { y: "syslog.server",                      g: "P519" },
    syslog_level:             { y: "syslog.log_level",                   g: "P520" },
  };

  return Object.entries(rules)
    .filter(([k]) => map[k])
    .map(([k, v]) => ({
      key: isYealink ? map[k].y : map[k].g,
      value: v,
    }));
}
