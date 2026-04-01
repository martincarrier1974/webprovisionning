"use client";

import { useActionState } from "react";

import { createProvisioningRuleAction } from "@/app/actions/provisioning";

type ClientOption = { id: string; name: string };
type SiteOption = { id: string; name: string };
type ModelOption = { id: string; displayName: string; vendor: string };
type PhoneOption = { id: string; label: string };

const initialState = undefined;

export function CreateProvisioningRuleForm({
  clients,
  sites,
  phoneModels,
  phones,
}: {
  clients: ClientOption[];
  sites: SiteOption[];
  phoneModels: ModelOption[];
  phones: PhoneOption[];
}) {
  const [state, action, pending] = useActionState(createProvisioningRuleAction, initialState);

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <div style={gridStyle}>
        <select name="source" defaultValue="DEFAULT" style={inputStyle}>
          <option value="DEFAULT">Default</option>
          <option value="CLIENT">Client</option>
          <option value="SITE">Site</option>
          <option value="MODEL">Model</option>
          <option value="PHONE">Phone</option>
        </select>
        <input name="key" placeholder="Clé de config" required style={inputStyle} />
      </div>

      <textarea name="value" placeholder="Valeur" rows={4} required style={{ ...inputStyle, padding: 12 }} />

      <div style={gridStyle}>
        <select name="clientId" defaultValue="" style={inputStyle}>
          <option value="">Aucun client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        <select name="siteId" defaultValue="" style={inputStyle}>
          <option value="">Aucun site</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
      </div>

      <div style={gridStyle}>
        <select name="phoneModelId" defaultValue="" style={inputStyle}>
          <option value="">Aucun modèle</option>
          {phoneModels.map((model) => (
            <option key={model.id} value={model.id}>{model.vendor} · {model.displayName}</option>
          ))}
        </select>
        <select name="phoneId" defaultValue="" style={inputStyle}>
          <option value="">Aucun téléphone</option>
          {phones.map((phone) => (
            <option key={phone.id} value={phone.id}>{phone.label}</option>
          ))}
        </select>
      </div>

      <div style={gridStyle}>
        <input name="sortOrder" type="number" defaultValue={0} style={inputStyle} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#f8fafc" }}>
          <input name="isEncrypted" type="checkbox" />
          Valeur sensible
        </label>
      </div>

      {state?.error ? <p style={{ color: "#fca5a5" }}>{state.error}</p> : null}
      {state?.success ? <p style={{ color: "#86efac" }}>{state.success}</p> : null}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Création..." : "Ajouter la règle"}
      </button>
    </form>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#f8fafc",
  padding: "0 14px",
};

const buttonStyle: React.CSSProperties = {
  minHeight: 46,
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};
