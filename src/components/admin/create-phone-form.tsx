"use client";

import { useActionState } from "react";

import { createPhoneAction } from "@/app/actions/admin";

type ClientOption = {
  id: string;
  name: string;
};

type SiteOption = {
  id: string;
  name: string;
  clientId: string;
};

type ModelOption = {
  id: string;
  displayName: string;
  vendor: string;
  modelCode: string;
};

const initialState = undefined;

export function CreatePhoneForm({
  clients,
  sites,
  phoneModels,
}: {
  clients: ClientOption[];
  sites: SiteOption[];
  phoneModels: ModelOption[];
}) {
  const [state, action, pending] = useActionState(createPhoneAction, initialState);

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <div style={gridStyle}>
        <select name="clientId" required defaultValue="" style={inputStyle}>
          <option value="" disabled>
            Choisir un client
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <select name="siteId" defaultValue="" style={inputStyle}>
          <option value="">Aucun site</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <div style={gridStyle}>
        <select name="phoneModelId" required defaultValue="" style={inputStyle}>
          <option value="" disabled>
            Choisir un modèle
          </option>
          {phoneModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.vendor} · {model.displayName}
            </option>
          ))}
        </select>

        <input name="macAddress" placeholder="MAC (ex: 001565A1B2C3)" required style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <input name="label" placeholder="Libellé" style={inputStyle} />
        <input name="extensionNumber" placeholder="Extension" style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <input name="sipUsername" placeholder="SIP username" style={inputStyle} />
        <input name="sipPassword" placeholder="SIP password" style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <input name="sipServer" placeholder="SIP server" style={inputStyle} />
        <select name="status" defaultValue="STAGED" style={inputStyle}>
          <option value="STAGED">En attente</option>
          <option value="ACTIVE">Actif</option>
          <option value="DISABLED">Désactivé</option>
          <option value="RETIRED">Retiré</option>
        </select>
      </div>

      <div style={gridStyle}>
        <input name="webPassword" placeholder="Mot de passe web" style={inputStyle} />
        <input name="adminPassword" placeholder="Mot de passe admin" style={inputStyle} />
      </div>

      {state?.error ? <p style={{ color: "#fca5a5" }}>{state.error}</p> : null}
      {state?.success ? <p style={{ color: "#86efac" }}>{state.success}</p> : null}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Création..." : "Ajouter le téléphone"}
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
