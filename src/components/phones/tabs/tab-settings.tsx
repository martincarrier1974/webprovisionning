"use client";

import { useState } from "react";

type Phone = {
  id: string;
  phoneModel: { vendor: string };
};

const SECTIONS = [
  { id: "call_features",   label: "Call Features" },
  { id: "preferences",     label: "Preferences" },
  { id: "prog_keys",       label: "Programmable Keys" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked ? "var(--accent)" : "#333",
        position: "relative", cursor: "pointer", transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s",
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

function SectionHeader({ title, small }: { title: string; small?: boolean }) {
  return (
    <div style={{
      padding: small ? "8px 20px" : "12px 20px",
      background: small ? "#0d0d0d" : "#111",
      borderBottom: "1px solid var(--card-border)",
      borderTop: small ? "1px solid var(--card-border)" : undefined,
    }}>
      <span style={{
        fontSize: small ? 11 : 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.05em",
        color: small ? "var(--muted)" : "var(--accent)",
      }}>{title}</span>
    </div>
  );
}

type Rules = Record<string, string>;

export function TabSettings({ phone }: { phone: Phone }) {
  const isYealink = phone.phoneModel.vendor === "YEALINK";

  const [rules, setRules] = useState<Rules>({
    // Call Features
    incoming_call_popup: "1",
    busy_tone_on_disconnect: "1",
    dnd_enable: "1",
    missed_call_notification: "0",
    auto_redial: "0",
    auto_redial_interval: "20",
    auto_redial_times: "10",
    direct_ip_call: "0",
    onhook_dial_barging: "1",
    predictive_dialing: "1",
    ring_for_call_waiting: "0",
    hide_blf_remote_status: "0",
    show_sip_error: "0",
    transfer_mode: "BlindTransfer",
    // Preferences
    ntp_interval: "1440",
    show_date_on_statusbar: "0",
    headset_key_mode: "DefaultMode",
    // Programmable Keys globals — AccountMode (1) requis pour BLF/SpeedDial
    key_mode: "1",
    show_keys_label: "1",
    show_label_background: "0",
    use_long_label: "0",
    show_vpk_icon: "0",
    enable_transfer_via_npk: "0",
    softkey_display_mode: "1",
    custom_call_screen_softkey: "1",
    enforce_softkey_position: "0",
  });

  function setRule(key: string, value: string) {
    setRules(r => ({ ...r, [key]: value }));
  }

  const [activeSection, setActiveSection] = useState("call_features");
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Settings</div>
          </div>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13,
              background: activeSection === s.id ? "rgba(255,107,0,0.1)" : "transparent",
              color: activeSection === s.id ? "var(--accent)" : "var(--text)",
              border: "none", borderLeft: activeSection === s.id ? "3px solid var(--accent)" : "3px solid transparent",
              cursor: "pointer", borderBottom: "1px solid #111",
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto" }}>

          {/* Call Features */}
          {activeSection === "call_features" && (
            <div>
              <SectionHeader title="Call Features" />
              <FieldRow label="Enable Incoming Call Popup">
                <Toggle checked={rules.incoming_call_popup === "1"} onChange={v => setRule("incoming_call_popup", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Busy Tone on Remote Disconnect">
                <Toggle checked={rules.busy_tone_on_disconnect === "1"} onChange={v => setRule("busy_tone_on_disconnect", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable DND Feature">
                <Toggle checked={rules.dnd_enable === "1"} onChange={v => setRule("dnd_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Missed Call Notification">
                <Toggle checked={rules.missed_call_notification === "1"} onChange={v => setRule("missed_call_notification", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Auto Redial">
                <Toggle checked={rules.auto_redial === "1"} onChange={v => setRule("auto_redial", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Auto Redial Interval (s)">
                <input className="form-input" value={rules.auto_redial_interval} onChange={e => setRule("auto_redial_interval", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Auto Redial Times">
                <input className="form-input" value={rules.auto_redial_times} onChange={e => setRule("auto_redial_times", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Enable Direct IP Call">
                <Toggle checked={rules.direct_ip_call === "1"} onChange={v => setRule("direct_ip_call", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Onhook Dial Barging">
                <Toggle checked={rules.onhook_dial_barging === "1"} onChange={v => setRule("onhook_dial_barging", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Predictive Dialing">
                <Toggle checked={rules.predictive_dialing === "1"} onChange={v => setRule("predictive_dialing", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Ring for Call Waiting">
                <Toggle checked={rules.ring_for_call_waiting === "1"} onChange={v => setRule("ring_for_call_waiting", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Hide BLF Remote Status">
                <Toggle checked={rules.hide_blf_remote_status === "1"} onChange={v => setRule("hide_blf_remote_status", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Show SIP Error Response">
                <Toggle checked={rules.show_sip_error === "1"} onChange={v => setRule("show_sip_error", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Transfer Mode via Softkey">
                <select className="form-input" value={rules.transfer_mode} onChange={e => setRule("transfer_mode", e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="BlindTransfer">Blind Transfer</option>
                  <option value="AttendedTransfer">Attended Transfer</option>
                  <option value="NewCall">New Call</option>
                </select>
              </FieldRow>
            </div>
          )}

          {/* Preferences */}
          {activeSection === "preferences" && (
            <div>
              <SectionHeader title="Preferences" />
              <FieldRow label="NTP Update Interval (min)">
                <input className="form-input" value={rules.ntp_interval} onChange={e => setRule("ntp_interval", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Show Date on Status Bar">
                <Toggle checked={rules.show_date_on_statusbar === "1"} onChange={v => setRule("show_date_on_statusbar", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="HEADSET Key Mode">
                <select className="form-input" value={rules.headset_key_mode} onChange={e => setRule("headset_key_mode", e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="DefaultMode">Default Mode</option>
                  <option value="AutoAnswer">Auto Answer</option>
                </select>
              </FieldRow>
            </div>
          )}

          {/* Programmable Keys globals */}
          {activeSection === "prog_keys" && (
            <div>
              <SectionHeader title="Virtual Multi-Purpose Keys" />
              <FieldRow label="Key Mode">
                <select className="form-input" value={rules.key_mode} onChange={e => setRule("key_mode", e.target.value)} style={{ maxWidth: 180 }}>
                  <option value="0">LineMode</option>
                  <option value="1">AccountMode</option>
                </select>
              </FieldRow>
              <FieldRow label="Show Keys Label">
                <Toggle checked={rules.show_keys_label === "1"} onChange={v => setRule("show_keys_label", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Show Label Background">
                <Toggle checked={rules.show_label_background === "1"} onChange={v => setRule("show_label_background", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Use Long Label">
                <Toggle checked={rules.use_long_label === "1"} onChange={v => setRule("use_long_label", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Show VPK Icon">
                <Toggle checked={rules.show_vpk_icon === "1"} onChange={v => setRule("show_vpk_icon", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Transfer via Non-Transfer Keys">
                <Toggle checked={rules.enable_transfer_via_npk === "1"} onChange={v => setRule("enable_transfer_via_npk", v ? "1" : "0")} />
              </FieldRow>
              <SectionHeader title="Softkeys" small />
              <FieldRow label="More Softkey Display Mode">
                <select className="form-input" value={rules.softkey_display_mode} onChange={e => setRule("softkey_display_mode", e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="0">Toggle</option>
                  <option value="1">Menu</option>
                </select>
              </FieldRow>
              <FieldRow label="Custom Call Screen Softkey Layout">
                <Toggle checked={rules.custom_call_screen_softkey === "1"} onChange={v => setRule("custom_call_screen_softkey", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enforce Softkey Layout Position">
                <Toggle checked={rules.enforce_softkey_position === "1"} onChange={v => setRule("enforce_softkey_position", v ? "1" : "0")} />
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
    incoming_call_popup:        { y: "features.popup_enable",              g: "P1400" },
    busy_tone_on_disconnect:    { y: "features.busy_tone_enable",          g: "P1405" },
    dnd_enable:                 { y: "features.dnd.allow",                 g: "P1408" },
    missed_call_notification:   { y: "features.missed_call_notify",        g: "P1410" },
    auto_redial:                { y: "features.auto_redial.enable",        g: "P1402" },
    auto_redial_interval:       { y: "features.auto_redial.interval",      g: "P1403" },
    auto_redial_times:          { y: "features.auto_redial.times",         g: "P1404" },
    direct_ip_call:             { y: "features.direct_ip_call.enable",     g: "P1407" },
    onhook_dial_barging:        { y: "features.onhook_dial_barging",       g: "P1414" },
    predictive_dialing:         { y: "features.predictive_dialing",        g: "P1415" },
    ring_for_call_waiting:      { y: "call_waiting.ring",                  g: "P1412" },
    hide_blf_remote_status:     { y: "features.hide_blf_remote_status",    g: "P1411" },
    show_sip_error:             { y: "features.show_sip_error",            g: "P1413" },
    transfer_mode:              { y: "transfer.mode",                      g: "P1416" },
    ntp_interval:               { y: "local_time.interval",                g: "P213" },
    show_date_on_statusbar:     { y: "phone_setting.show_date_statusbar",  g: "P1305" },
    headset_key_mode:           { y: "headset.key_mode",                   g: "P1350" },
    key_mode:                   { y: "linekey.key_mode",                   g: "P1362" },
    show_keys_label:            { y: "linekey.show_label",                 g: "P1363" },
    show_label_background:      { y: "linekey.show_label_background",      g: "P1364" },
    use_long_label:             { y: "linekey.use_long_label",             g: "P1365" },
    show_vpk_icon:              { y: "linekey.show_vpk_icon",              g: "P1366" },
    enable_transfer_via_npk:    { y: "linekey.transfer_via_npk",           g: "P1367" },
    softkey_display_mode:       { y: "softkey.more_display_mode",          g: "P1368" },
    custom_call_screen_softkey: { y: "softkey.custom_call_screen",         g: "P1369" },
    enforce_softkey_position:   { y: "softkey.enforce_position",           g: "P1370" },
  };

  return Object.entries(rules)
    .filter(([k]) => map[k])
    .map(([k, v]) => ({
      key: isYealink ? map[k].y : map[k].g,
      value: v,
    }));
}
