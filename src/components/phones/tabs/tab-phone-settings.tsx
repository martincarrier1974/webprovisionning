"use client";

import { useState } from "react";

type Phone = {
  id: string;
  phoneModel: { vendor: string };
};

const SECTIONS = [
  { id: "call",    label: "Call Settings" },
  { id: "ringtone", label: "Ring Tone" },
  { id: "general", label: "General Settings" },
  { id: "intercom", label: "Intercom" },
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

export function TabPhoneSettings({ phone }: { phone: Phone }) {
  const isYealink = phone.phoneModel.vendor === "YEALINK";

  const [rules, setRules] = useState<Rules>({
    // Call Settings
    call_waiting: "1",
    call_waiting_tone: "1",
    enable_conference: "1",
    enable_transfer: "1",
    always_ring_speaker: "0",
    escape_hash: "1",
    record_mode: "0",
    offhook_timeout: "30",
    quick_ip_call: "0",
    key_as_send: "1",         // 1=# , 0=*
    no_key_timeout: "4",
    ring_timeout: "60",
    refer_to_target: "1",
    rfc2543_hold: "0",
    blind_transfer_timeout: "30",
    call_fwd_no_answer_timeout: "20",
    local_call_features: "0",
    ignore_alert_info: "1",
    dial_plan: "{ x+ | \\+x+ | *x+ | **x*x+ }",
    // Ring Tone
    default_ringtone: "System Ringtone",
    lock_volume: "0",
    notif_volume: "5",
    call_waiting_tone_gain: "2",  // 2=High
    // General Settings
    keepalive_interval: "20",
    local_rtp_port: "5004",
    local_rtp_range: "200",
    dtmf_display: "1",
    use_random_port: "0",
    // Intercom
    allow_auto_answer: "1",
    mute_on_intercom: "0",
    intercom_tone: "1",
  });

  function setRule(key: string, value: string) {
    setRules(r => ({ ...r, [key]: value }));
  }

  const [activeSection, setActiveSection] = useState("call");
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Phone Settings</div>
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

          {activeSection === "call" && (
            <div>
              <SectionHeader title="Call Settings" />
              <FieldRow label="Enable Call Waiting">
                <Toggle checked={rules.call_waiting === "1"} onChange={v => setRule("call_waiting", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Call Waiting Tone">
                <Toggle checked={rules.call_waiting_tone === "1"} onChange={v => setRule("call_waiting_tone", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Conference">
                <Toggle checked={rules.enable_conference === "1"} onChange={v => setRule("enable_conference", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Transfer">
                <Toggle checked={rules.enable_transfer === "1"} onChange={v => setRule("enable_transfer", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Always Ring Speaker">
                <Toggle checked={rules.always_ring_speaker === "1"} onChange={v => setRule("always_ring_speaker", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Escape '#' as %23 in SIP URI">
                <Toggle checked={rules.escape_hash === "1"} onChange={v => setRule("escape_hash", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Record Mode">
                <Toggle checked={rules.record_mode === "1"} onChange={v => setRule("record_mode", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Use Quick IP Call Mode">
                <Toggle checked={rules.quick_ip_call === "1"} onChange={v => setRule("quick_ip_call", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="RFC2543 Hold">
                <Toggle checked={rules.rfc2543_hold === "1"} onChange={v => setRule("rfc2543_hold", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Refer-To Use Target Contact">
                <Toggle checked={rules.refer_to_target === "1"} onChange={v => setRule("refer_to_target", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Ignore Alert-Info Header">
                <Toggle checked={rules.ignore_alert_info === "1"} onChange={v => setRule("ignore_alert_info", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Off-hook Timeout (s)">
                <input className="form-input" value={rules.offhook_timeout} onChange={e => setRule("offhook_timeout", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="Ring Timeout (s)">
                <input className="form-input" value={rules.ring_timeout} onChange={e => setRule("ring_timeout", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="No Key Entry Timeout (s)">
                <input className="form-input" value={rules.no_key_timeout} onChange={e => setRule("no_key_timeout", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="Blind Transfer Wait Timeout (s)">
                <input className="form-input" value={rules.blind_transfer_timeout} onChange={e => setRule("blind_transfer_timeout", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="Call Forward No Answer Timeout (s)">
                <input className="form-input" value={rules.call_fwd_no_answer_timeout} onChange={e => setRule("call_fwd_no_answer_timeout", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="Enable Local Call Features">
                <Toggle checked={rules.local_call_features === "1"} onChange={v => setRule("local_call_features", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Dial Plan">
                <input className="form-input" value={rules.dial_plan} onChange={e => setRule("dial_plan", e.target.value)} />
              </FieldRow>
            </div>
          )}

          {activeSection === "ringtone" && (
            <div>
              <SectionHeader title="Ring Tone" />
              <FieldRow label="Default Ringtone">
                <select className="form-input" value={rules.default_ringtone} onChange={e => setRule("default_ringtone", e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="System Ringtone">System Ringtone</option>
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={`Ring${n}.wav`}>Ring{n}.wav</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Call Waiting Tone Gain">
                <select className="form-input" value={rules.call_waiting_tone_gain} onChange={e => setRule("call_waiting_tone_gain", e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="0">Low</option>
                  <option value="1">Medium</option>
                  <option value="2">High</option>
                </select>
              </FieldRow>
              <FieldRow label="Notification Tone Volume (0-9)">
                <input className="form-input" value={rules.notif_volume} onChange={e => setRule("notif_volume", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="Lock Volume">
                <Toggle checked={rules.lock_volume === "1"} onChange={v => setRule("lock_volume", v ? "1" : "0")} />
              </FieldRow>
            </div>
          )}

          {activeSection === "general" && (
            <div>
              <SectionHeader title="General Settings" />
              <FieldRow label="Keep-Alive Interval (s)">
                <input className="form-input" value={rules.keepalive_interval} onChange={e => setRule("keepalive_interval", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
              <FieldRow label="Local RTP Port">
                <input className="form-input" value={rules.local_rtp_port} onChange={e => setRule("local_rtp_port", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Local RTP Port Range">
                <input className="form-input" value={rules.local_rtp_range} onChange={e => setRule("local_rtp_range", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Enable In-call DTMF Display">
                <Toggle checked={rules.dtmf_display === "1"} onChange={v => setRule("dtmf_display", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Use Random Port">
                <Toggle checked={rules.use_random_port === "1"} onChange={v => setRule("use_random_port", v ? "1" : "0")} />
              </FieldRow>
            </div>
          )}

          {activeSection === "intercom" && (
            <div>
              <SectionHeader title="Intercom Settings" />
              <FieldRow label="Allow Auto Answer by Call-Info/Alert-Info">
                <Toggle checked={rules.allow_auto_answer === "1"} onChange={v => setRule("allow_auto_answer", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Mute on Intercom Answer">
                <Toggle checked={rules.mute_on_intercom === "1"} onChange={v => setRule("mute_on_intercom", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Play Warning Tone for Auto Answer">
                <Toggle checked={rules.intercom_tone === "1"} onChange={v => setRule("intercom_tone", v ? "1" : "0")} />
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
    call_waiting:               { y: "call_waiting.enable",                g: "P52" },
    call_waiting_tone:          { y: "call_waiting.tone",                  g: "P53" },
    enable_conference:          { y: "account.1.conference.enable",        g: "P56" },
    enable_transfer:            { y: "account.1.transfer.enable",          g: "P55" },
    always_ring_speaker:        { y: "phone_setting.always_ring_speaker",  g: "P51" },
    escape_hash:                { y: "account.1.escape_pound",             g: "P54" },
    record_mode:                { y: "features.record.enable",             g: "P109" },
    offhook_timeout:            { y: "phone_setting.off_hook_timeout",     g: "P102" },
    quick_ip_call:              { y: "features.quick_ip_call.enable",      g: "P110" },
    key_as_send:                { y: "phone_setting.key_as_send",          g: "P111" },
    no_key_timeout:             { y: "phone_setting.no_key_entry_timeout", g: "P112" },
    ring_timeout:               { y: "account.1.ring.duration",            g: "P85" },
    refer_to_target:            { y: "account.1.refer_to_target",          g: "P301" },
    rfc2543_hold:               { y: "account.1.rfc2543_hold",             g: "P88" },
    blind_transfer_timeout:     { y: "transfer.blind.timeout",             g: "P284" },
    call_fwd_no_answer_timeout: { y: "forward.no_answer.timeout",          g: "P1474" },
    local_call_features:        { y: "features.local_feature.enable",      g: "P1475" },
    ignore_alert_info:          { y: "account.1.alert_info_tone",          g: "P86" },
    dial_plan:                  { y: "dialplan.dialnow.rule",              g: "P2359" },
    default_ringtone:           { y: "phone_setting.ring_type",            g: "P76" },
    call_waiting_tone_gain:     { y: "call_waiting.tone_gain",             g: "P1501" },
    notif_volume:               { y: "phone_setting.notification_volume",  g: "P1500" },
    lock_volume:                { y: "phone_setting.lock_volume",          g: "P160" },
    keepalive_interval:         { y: "sip.keep_alive_interval",            g: "P1390" },
    local_rtp_port:             { y: "network.port.rtp",                   g: "P1391" },
    local_rtp_range:            { y: "network.port.rtp_range",             g: "P1392" },
    dtmf_display:               { y: "features.dtmf_display",              g: "P1393" },
    use_random_port:            { y: "sip.use_random_port",                g: "P1394" },
    allow_auto_answer:          { y: "features.intercom.allow",            g: "P1371" },
    mute_on_intercom:           { y: "features.intercom.mute",             g: "P1372" },
    intercom_tone:              { y: "features.intercom.tone",             g: "P1373" },
  };

  return Object.entries(rules)
    .filter(([k]) => map[k])
    .map(([k, v]) => ({
      key: isYealink ? map[k].y : map[k].g,
      value: v,
    }));
}
