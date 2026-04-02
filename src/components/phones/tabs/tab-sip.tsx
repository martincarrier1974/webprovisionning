"use client";

import { useState } from "react";

type Phone = {
  id: string;
  label: string | null;
  extensionNumber: string | null;
  sipUsername: string | null;
  sipPassword: string | null;
  sipServer: string | null;
  status: string;
  phoneModel: { vendor: string };
};

// ── Sidebar sections ───────────────────────────────────────────────────────
const SECTIONS = [
  { id: "general",   label: "Paramètres généraux" },
  { id: "advanced",  label: "Advanced Settings" },
  { id: "call",      label: "Call Settings" },
  { id: "sip",       label: "SIP Settings" },
  { id: "codec",     label: "Codec Settings" },
  { id: "audio",     label: "Audio Settings" },
];

// ── Toggle helper ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 8 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, background: checked ? "var(--accent)" : "#333",
          position: "relative", cursor: "pointer", transition: "background 0.2s",
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s",
        }} />
      </div>
    </label>
  );
}

// ── Field row ──────────────────────────────────────────────────────────────
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

type Rules = Record<string, string>;

export function TabSip({ phone }: { phone: Phone }) {
  const isYealink = phone.phoneModel.vendor === "YEALINK";

  // ── SIP de base (DB) ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    label: phone.label ?? "",
    extensionNumber: phone.extensionNumber ?? "",
    sipUsername: phone.sipUsername ?? "",
    sipPassword: phone.sipPassword ?? "",
    sipServer: phone.sipServer ?? "",
    status: phone.status,
  });

  // ── Règles de provisioning phone-level ────────────────────────────────
  const [rules, setRules] = useState<Rules>({
    // Advanced
    sip_trust_ctrl: "1",
    blf_pickup_code: "**",
    srtp_encryption: "0",
    // Call
    auto_answer: "0",
    ring_type: "Ring1.wav",
    ring_timeout: "60",
    anonymous_call: "0",
    anonymous_call_rejection: "0",
    call_waiting: "1",
    call_waiting_tone: "1",
    transfer_enable: "1",
    conference_enable: "1",
    // SIP
    sip_port: "5060",
    reg_expires: "60",
    reg_retry_interval: "20",
    options_keepalive: "1",
    options_keepalive_interval: "30",
    options_keepalive_max_retries: "3",
    subscribe_mwi: "0",
    enable_100rel: "0",
    sip_transport: "0",
    session_timer_enable: "1",
    session_timer_expires: "180",
    session_timer_min_se: "90",
    // Codec
    dtmf_type: "1",
    dtmf_payload: "101",
    dtmf_inband: "0",
    dtmf_sip_info: "0",
    silence_suppression: "0",
    voice_frames_tx: "2",
    codec1: "PCMU",
    codec2: "PCMA",
    codec3: "G722",
    codec4: "G729",
    codec5_enable: "0",
    // Audio / SRTP
    srtp_mode: "0",
    symmetric_rtp: "0",
  });

  function setRule(key: string, value: string) {
    setRules(r => ({ ...r, [key]: value }));
  }

  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Sauvegarde ────────────────────────────────────────────────────────
  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      // 1. Sauvegarder les champs SIP de base
      const sipRes = await fetch(`/api/admin/phones/${phone.id}/update`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const sipJson = await sipRes.json();
      if (!sipJson.ok) throw new Error(sipJson.error ?? "Erreur SIP");

      // 2. Sauvegarder les règles de provisioning
      const mappedRules = buildRules(rules, isYealink);
      await fetch(`/api/admin/phones/${phone.id}/rules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules: mappedRules }),
      });

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

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <div style={{ width: 200, borderRight: "1px solid var(--card-border)", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--card-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Account</div>
          </div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13,
                background: activeSection === s.id ? "rgba(255,107,0,0.1)" : "transparent",
                color: activeSection === s.id ? "var(--accent)" : "var(--text)",
                border: "none", borderLeft: activeSection === s.id ? "3px solid var(--accent)" : "3px solid transparent",
                cursor: "pointer", borderBottom: "1px solid #111",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Main content ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "auto" }}>

          {/* General */}
          {activeSection === "general" && (
            <div>
              <SectionHeader title="Paramètres généraux" />
              <FieldRow label="Nom / Label">
                <input className="form-input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="ex: Bureau réception" />
              </FieldRow>
              <FieldRow label="Numéro de poste">
                <input className="form-input" value={form.extensionNumber} onChange={e => setForm(f => ({ ...f, extensionNumber: e.target.value }))} placeholder="ex: 1001" />
              </FieldRow>
              <FieldRow label="Serveur SIP">
                <input className="form-input" value={form.sipServer} onChange={e => setForm(f => ({ ...f, sipServer: e.target.value }))} placeholder="ex: sip.bztelecom.ca" />
              </FieldRow>
              <FieldRow label="Nom d'utilisateur SIP">
                <input className="form-input" value={form.sipUsername} onChange={e => setForm(f => ({ ...f, sipUsername: e.target.value }))} placeholder="ex: 1001" />
              </FieldRow>
              <FieldRow label="Mot de passe SIP">
                <input className="form-input" type="password" value={form.sipPassword} onChange={e => setForm(f => ({ ...f, sipPassword: e.target.value }))} placeholder="••••••••" />
              </FieldRow>
              <FieldRow label="Statut">
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="STAGED">En attente</option>
                  <option value="ACTIVE">Actif</option>
                  <option value="DISABLED">Désactivé</option>
                  <option value="RETIRED">Retiré</option>
                </select>
              </FieldRow>
            </div>
          )}

          {/* Advanced Settings */}
          {activeSection === "advanced" && (
            <div>
              <SectionHeader title="Advanced Settings" />
              <FieldRow label="Accept Incoming SIP from Proxy Only">
                <Toggle checked={rules.sip_trust_ctrl === "1"} onChange={v => setRule("sip_trust_ctrl", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Authenticate Incoming INVITE">
                <Toggle checked={rules.auth_incoming_invite === "1"} onChange={v => setRule("auth_incoming_invite", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Allow SIP Reset">
                <Toggle checked={rules.allow_sip_reset === "1"} onChange={v => setRule("allow_sip_reset", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Allow Unsolicited REFER">
                <Toggle checked={rules.allow_unsolicited_refer === "1"} onChange={v => setRule("allow_unsolicited_refer", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Validate Incoming SIP Messages">
                <Toggle checked={rules.validate_sip_messages === "1"} onChange={v => setRule("validate_sip_messages", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="BLF Call-pickup Prefix">
                <input className="form-input" value={rules.blf_pickup_code} onChange={e => setRule("blf_pickup_code", e.target.value)} placeholder="**" style={{ maxWidth: 120 }} />
              </FieldRow>
            </div>
          )}

          {/* Call Settings */}
          {activeSection === "call" && (
            <div>
              <SectionHeader title="Call Settings" />
              <FieldRow label="Auto Answer">
                <Toggle checked={rules.auto_answer === "1"} onChange={v => setRule("auto_answer", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Call Waiting">
                <Toggle checked={rules.call_waiting === "1"} onChange={v => setRule("call_waiting", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Call Waiting Tone">
                <Toggle checked={rules.call_waiting_tone === "1"} onChange={v => setRule("call_waiting_tone", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Transfer">
                <Toggle checked={rules.transfer_enable === "1"} onChange={v => setRule("transfer_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Enable Conference">
                <Toggle checked={rules.conference_enable === "1"} onChange={v => setRule("conference_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Send Anonymous">
                <Toggle checked={rules.anonymous_call === "1"} onChange={v => setRule("anonymous_call", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Anonymous Call Rejection">
                <Toggle checked={rules.anonymous_call_rejection === "1"} onChange={v => setRule("anonymous_call_rejection", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Ring Timeout (s)">
                <input className="form-input" value={rules.ring_timeout} onChange={e => setRule("ring_timeout", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Sonnerie par défaut">
                <select className="form-input" value={rules.ring_type} onChange={e => setRule("ring_type", e.target.value)} style={{ maxWidth: 200 }}>
                  {["Ring1.wav","Ring2.wav","Ring3.wav","Ring4.wav","Ring5.wav","Ring6.wav","Ring7.wav","Ring8.wav"].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </FieldRow>
            </div>
          )}

          {/* SIP Settings */}
          {activeSection === "sip" && (
            <div>
              <SectionHeader title="SIP Settings" />
              <FieldRow label="SIP Registration">
                <Toggle checked={true} onChange={() => {}} />
              </FieldRow>
              <FieldRow label="Local SIP Port">
                <input className="form-input" value={rules.sip_port} onChange={e => setRule("sip_port", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="REGISTER Expiration (s)">
                <input className="form-input" value={rules.reg_expires} onChange={e => setRule("reg_expires", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Registration Retry Wait (s)">
                <input className="form-input" value={rules.reg_retry_interval} onChange={e => setRule("reg_retry_interval", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Enable OPTIONS Keep-Alive">
                <Toggle checked={rules.options_keepalive === "1"} onChange={v => setRule("options_keepalive", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="OPTIONS Keep-Alive Interval (s)">
                <input className="form-input" value={rules.options_keepalive_interval} onChange={e => setRule("options_keepalive_interval", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="OPTIONS Keep-Alive Max Retries">
                <input className="form-input" value={rules.options_keepalive_max_retries} onChange={e => setRule("options_keepalive_max_retries", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="SIP Transport">
                <select className="form-input" value={rules.sip_transport} onChange={e => setRule("sip_transport", e.target.value)} style={{ maxWidth: 150 }}>
                  <option value="0">UDP</option>
                  <option value="1">TCP</option>
                  <option value="2">TLS</option>
                </select>
              </FieldRow>
              <FieldRow label="Enable 100rel">
                <Toggle checked={rules.enable_100rel === "1"} onChange={v => setRule("enable_100rel", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="SUBSCRIBE for MWI">
                <Toggle checked={rules.subscribe_mwi === "1"} onChange={v => setRule("subscribe_mwi", v ? "1" : "0")} />
              </FieldRow>
              <SectionHeader title="Session Timer" small />
              <FieldRow label="Enable Session Timer">
                <Toggle checked={rules.session_timer_enable === "1"} onChange={v => setRule("session_timer_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Session Expiration (s)">
                <input className="form-input" value={rules.session_timer_expires} onChange={e => setRule("session_timer_expires", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Min-SE (s)">
                <input className="form-input" value={rules.session_timer_min_se} onChange={e => setRule("session_timer_min_se", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
            </div>
          )}

          {/* Codec Settings */}
          {activeSection === "codec" && (
            <div>
              <SectionHeader title="Codec Settings" />
              <FieldRow label="Codec 1 (priorité 1)">
                <select className="form-input" value={rules.codec1} onChange={e => setRule("codec1", e.target.value)} style={{ maxWidth: 160 }}>
                  {["PCMU","PCMA","G722","G729","G726","iLBC","OPUS"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Codec 2 (priorité 2)">
                <select className="form-input" value={rules.codec2} onChange={e => setRule("codec2", e.target.value)} style={{ maxWidth: 160 }}>
                  {["PCMU","PCMA","G722","G729","G726","iLBC","OPUS"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Codec 3 (priorité 3)">
                <select className="form-input" value={rules.codec3} onChange={e => setRule("codec3", e.target.value)} style={{ maxWidth: 160 }}>
                  {["PCMU","PCMA","G722","G729","G726","iLBC","OPUS"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Codec 4 (priorité 4)">
                <select className="form-input" value={rules.codec4} onChange={e => setRule("codec4", e.target.value)} style={{ maxWidth: 160 }}>
                  {["PCMU","PCMA","G722","G729","G726","iLBC","OPUS"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FieldRow>
              <SectionHeader title="DTMF" small />
              <FieldRow label="Send DTMF">
                <select className="form-input" value={rules.dtmf_type} onChange={e => setRule("dtmf_type", e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="0">In-audio</option>
                  <option value="1">Via RTP (RFC2833)</option>
                  <option value="2">Via SIP INFO</option>
                </select>
              </FieldRow>
              <FieldRow label="DTMF Payload Type">
                <input className="form-input" value={rules.dtmf_payload} onChange={e => setRule("dtmf_payload", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="Silence Suppression (VAD)">
                <Toggle checked={rules.silence_suppression === "1"} onChange={v => setRule("silence_suppression", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Voice Frames per TX">
                <input className="form-input" value={rules.voice_frames_tx} onChange={e => setRule("voice_frames_tx", e.target.value)} style={{ maxWidth: 80 }} />
              </FieldRow>
            </div>
          )}

          {/* Audio Settings (SRTP) */}
          {activeSection === "audio" && (
            <div>
              <SectionHeader title="Audio Settings" />
              <FieldRow label="SRTP Mode">
                <select className="form-input" value={rules.srtp_mode} onChange={e => setRule("srtp_mode", e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="0">Disabled</option>
                  <option value="1">Enabled but not forced</option>
                  <option value="2">Enabled and forced</option>
                </select>
              </FieldRow>
              <FieldRow label="Symmetric RTP">
                <Toggle checked={rules.symmetric_rtp === "1"} onChange={v => setRule("symmetric_rtp", v ? "1" : "0")} />
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

function SectionHeader({ title, small }: { title: string; small?: boolean }) {
  return (
    <div style={{
      padding: small ? "8px 20px" : "12px 20px",
      background: small ? "#0d0d0d" : "#111",
      borderBottom: "1px solid var(--card-border)",
      borderTop: small ? "1px solid var(--card-border)" : undefined,
    }}>
      <span style={{
        fontSize: small ? 11 : 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: small ? "var(--muted)" : "var(--accent)",
      }}>{title}</span>
    </div>
  );
}

// ── Mapper les clés génériques → clés vendor ──────────────────────────────
function buildRules(rules: Rules, isYealink: boolean): { key: string; value: string }[] {
  const map: Record<string, { y: string; g: string }> = {
    sip_trust_ctrl:              { y: "account.1.sip_trust_ctrl",            g: "P426" },
    auth_incoming_invite:        { y: "account.1.auth_incoming_invite",       g: "P429" },
    allow_sip_reset:             { y: "account.1.allow_sip_reset",            g: "P427" },
    allow_unsolicited_refer:     { y: "account.1.allow_unsolicited_refer",    g: "P428" },
    validate_sip_messages:       { y: "account.1.validate_sip_messages",      g: "P433" },
    blf_pickup_code:             { y: "features.blf_pickup_code",             g: "P1464" },
    auto_answer:                 { y: "account.1.auto_answer",                g: "P175" },
    call_waiting:                { y: "call_waiting.enable",                  g: "P52" },
    call_waiting_tone:           { y: "call_waiting.tone",                    g: "P53" },
    transfer_enable:             { y: "account.1.transfer.enable",            g: "P55" },
    conference_enable:           { y: "account.1.conference.enable",          g: "P56" },
    anonymous_call:              { y: "account.1.anonymous_call",             g: "P81" },
    anonymous_call_rejection:    { y: "account.1.anonymous_call_rejection",   g: "P80" },
    ring_timeout:                { y: "account.1.ring.duration",              g: "P85" },
    ring_type:                   { y: "account.1.ring_type",                  g: "P76" },
    sip_port:                    { y: "sip.listen_port",                      g: "P23" },
    reg_expires:                 { y: "account.1.sip_server.1.expires",       g: "P91" },
    reg_retry_interval:          { y: "account.1.reg_fail_retry_interval",    g: "P92" },
    options_keepalive:           { y: "account.1.keep_alive_type",            g: "P1395" },
    options_keepalive_interval:  { y: "account.1.keep_alive_interval",        g: "P1396" },
    options_keepalive_max_retries:{ y: "account.1.keep_alive_max_retries",   g: "P1397" },
    sip_transport:               { y: "account.1.sip_server.1.transport_type",g: "P1042" },
    enable_100rel:               { y: "account.1.100rel_enable",              g: "P1081" },
    subscribe_mwi:               { y: "account.1.subscribe_mwi",              g: "P1085" },
    session_timer_enable:        { y: "account.1.session_timer.enable",       g: "P1170" },
    session_timer_expires:       { y: "account.1.session_timer.expires",      g: "P1171" },
    session_timer_min_se:        { y: "account.1.session_timer.min_se",       g: "P1172" },
    codec1:                      { y: "account.1.codec.1.payload_type",       g: "P57_codec1" },
    codec2:                      { y: "account.1.codec.2.payload_type",       g: "P57_codec2" },
    codec3:                      { y: "account.1.codec.3.payload_type",       g: "P57_codec3" },
    codec4:                      { y: "account.1.codec.4.payload_type",       g: "P57_codec4" },
    dtmf_type:                   { y: "account.1.dtmf.type",                  g: "P98" },
    dtmf_payload:                { y: "account.1.dtmf.payload",               g: "P103" },
    silence_suppression:         { y: "account.1.vad_enable",                 g: "P106" },
    voice_frames_tx:             { y: "account.1.voice_frames_tx",            g: "P137" },
    srtp_mode:                   { y: "account.1.srtp_encryption",            g: "P183" },
    symmetric_rtp:               { y: "account.1.symmetric_rtp",              g: "P1331" },
  };

  return Object.entries(rules)
    .filter(([k]) => map[k])
    .map(([k, v]) => ({
      key: isYealink ? map[k].y : map[k].g,
      value: v,
    }));
}
