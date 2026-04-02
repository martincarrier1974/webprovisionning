"use client";

import { useState } from "react";

type Phone = {
  id: string;
  phoneModel: { vendor: string };
};

const SECTIONS = [
  { id: "ipv4",    label: "IPv4 / VLAN" },
  { id: "8021x",  label: "802.1X" },
  { id: "pc_port", label: "Port PC" },
  { id: "qos",    label: "QoS" },
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

export function TabNetwork({ phone }: { phone: Phone }) {
  const isYealink = phone.phoneModel.vendor === "YEALINK";

  const [rules, setRules] = useState<Rules>({
    // IPv4/VLAN
    dhcp_enable: "1",
    ip_mode: "0",
    vlan_enable: "0",
    vlan_id: "0",
    vlan_priority: "0",
    dhcp_vlan_override: "0",
    // 802.1X
    dot1x_mode: "0",
    dot1x_identity: "",
    // PC Port
    pc_port_enable: "1",
    // QoS
    rtp_tos: "46",
    sip_tos: "26",
  });

  function setRule(key: string, value: string) {
    setRules(r => ({ ...r, [key]: value }));
  }

  const [activeSection, setActiveSection] = useState("ipv4");
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Network Settings</div>
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

          {activeSection === "ipv4" && (
            <div>
              <SectionHeader title="IPv4 / VLAN" />
              <FieldRow label="IP Mode">
                <select className="form-input" value={rules.ip_mode} onChange={e => setRule("ip_mode", e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="0">IPv4 Only</option>
                  <option value="1">IPv6 Only</option>
                  <option value="2">IPv4 + IPv6</option>
                </select>
              </FieldRow>
              <FieldRow label="DHCP">
                <Toggle checked={rules.dhcp_enable === "1"} onChange={v => setRule("dhcp_enable", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="DHCP VLAN Override">
                <Toggle checked={rules.dhcp_vlan_override === "1"} onChange={v => setRule("dhcp_vlan_override", v ? "1" : "0")} />
              </FieldRow>
              <FieldRow label="Layer 2 QoS VLAN Tag (802.1Q)" hint="0 = désactivé">
                <input className="form-input" value={rules.vlan_id} onChange={e => setRule("vlan_id", e.target.value)} style={{ maxWidth: 100 }} placeholder="0" />
              </FieldRow>
              <FieldRow label="Layer 2 QoS 802.1p Priority">
                <select className="form-input" value={rules.vlan_priority} onChange={e => setRule("vlan_priority", e.target.value)} style={{ maxWidth: 100 }}>
                  {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={String(n)}>{n}</option>)}
                </select>
              </FieldRow>
            </div>
          )}

          {activeSection === "8021x" && (
            <div>
              <SectionHeader title="802.1X" />
              <FieldRow label="802.1X Mode">
                <select className="form-input" value={rules.dot1x_mode} onChange={e => setRule("dot1x_mode", e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="0">Disabled</option>
                  <option value="1">EAP-MD5</option>
                  <option value="2">EAP-TLS</option>
                  <option value="3">EAP-PEAP</option>
                </select>
              </FieldRow>
              <FieldRow label="802.1X Identity">
                <input className="form-input" value={rules.dot1x_identity} onChange={e => setRule("dot1x_identity", e.target.value)} placeholder="Identifiant" />
              </FieldRow>
            </div>
          )}

          {activeSection === "pc_port" && (
            <div>
              <SectionHeader title="Port PC" />
              <FieldRow label="Enable PC Port" hint="Bridge vers le PC connecté">
                <Toggle checked={rules.pc_port_enable === "1"} onChange={v => setRule("pc_port_enable", v ? "1" : "0")} />
              </FieldRow>
            </div>
          )}

          {activeSection === "qos" && (
            <div>
              <SectionHeader title="QoS / DSCP" />
              <FieldRow label="RTP DSCP (valeur)" hint="46 = EF (voix)">
                <input className="form-input" value={rules.rtp_tos} onChange={e => setRule("rtp_tos", e.target.value)} style={{ maxWidth: 100 }} />
              </FieldRow>
              <FieldRow label="SIP DSCP (valeur)" hint="26 = AF31">
                <input className="form-input" value={rules.sip_tos} onChange={e => setRule("sip_tos", e.target.value)} style={{ maxWidth: 100 }} />
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
    dhcp_enable:        { y: "static.network.dhcp_enable",             g: "P11" },
    ip_mode:            { y: "network.ip_address_mode",                g: "P6767" },
    vlan_enable:        { y: "network.vlan.internet_port_enable",      g: "P5" },
    vlan_id:            { y: "network.vlan.internet_port_vid",         g: "P3" },
    vlan_priority:      { y: "network.vlan.internet_port_priority",    g: "P4" },
    dhcp_vlan_override: { y: "network.vlan.dhcp_override",             g: "P310" },
    dot1x_mode:         { y: "network.8021x.mode",                     g: "P8020" },
    dot1x_identity:     { y: "network.8021x.identity",                 g: "P8021" },
    pc_port_enable:     { y: "network.pc_port.enable",                 g: "P329" },
    rtp_tos:            { y: "network.quality_of_service.rtptos",      g: "P93" },
    sip_tos:            { y: "network.quality_of_service.signaltos",   g: "P94" },
  };

  return Object.entries(rules)
    .filter(([k]) => map[k])
    .map(([k, v]) => ({
      key: isYealink ? map[k].y : map[k].g,
      value: v,
    }));
}
