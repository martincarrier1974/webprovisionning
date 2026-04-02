"use client";

import { useState, useTransition } from "react";

import { deletePhoneAction, updatePhoneAction } from "@/app/actions/admin";

type ClientOption = {
  id: string;
  name: string;
};

type SiteOption = {
  id: string;
  name: string;
};

type ModelOption = {
  id: string;
  displayName: string;
  vendor: string;
};

type PhoneData = {
  id: string;
  clientId: string;
  siteId: string | null;
  phoneModelId: string;
  macAddress: string;
  label: string | null;
  extensionNumber: string | null;
  sipUsername: string | null;
  sipPassword: string | null;
  sipServer: string | null;
  webPassword: string | null;
  adminPassword: string | null;
  status: "STAGED" | "ACTIVE" | "DISABLED" | "RETIRED";
};

export function EditPhoneForm({
  phone,
  clients,
  sites,
  phoneModels,
}: {
  phone: PhoneData;
  clients: ClientOption[];
  sites: SiteOption[];
  phoneModels: ModelOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  return editing ? (
    <form
      action={(formData) =>
        startTransition(async () => {
          await updatePhoneAction(formData);
          setEditing(false);
        })
      }
      style={{ display: "grid", gap: 10, marginTop: 10 }}
    >
      <input type="hidden" name="id" value={phone.id} />
      <div style={gridStyle}>
        <select name="clientId" defaultValue={phone.clientId} style={inputStyle}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <select name="siteId" defaultValue={phone.siteId ?? ""} style={inputStyle}>
          <option value="">Aucun site</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>
      <div style={gridStyle}>
        <select name="phoneModelId" defaultValue={phone.phoneModelId} style={inputStyle}>
          {phoneModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.vendor} · {model.displayName}
            </option>
          ))}
        </select>
        <input name="macAddress" defaultValue={phone.macAddress} style={inputStyle} />
      </div>
      <div style={gridStyle}>
        <input name="label" defaultValue={phone.label ?? ""} style={inputStyle} />
        <input name="extensionNumber" defaultValue={phone.extensionNumber ?? ""} style={inputStyle} />
      </div>
      <div style={gridStyle}>
        <input name="sipUsername" defaultValue={phone.sipUsername ?? ""} style={inputStyle} />
        <input name="sipPassword" defaultValue={phone.sipPassword ?? ""} style={inputStyle} />
      </div>
      <div style={gridStyle}>
        <input name="sipServer" defaultValue={phone.sipServer ?? ""} style={inputStyle} />
        <select name="status" defaultValue={phone.status} style={inputStyle}>
          <option value="STAGED">En attente</option>
          <option value="ACTIVE">Actif</option>
          <option value="DISABLED">Désactivé</option>
          <option value="RETIRED">Retiré</option>
        </select>
      </div>
      <div style={gridStyle}>
        <input name="webPassword" defaultValue={phone.webPassword ?? ""} style={inputStyle} />
        <input name="adminPassword" defaultValue={phone.adminPassword ?? ""} style={inputStyle} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" disabled={pending} style={{ ...buttonStyle, background: "#1d4ed8" }}>
          Enregistrer
        </button>
        <button type="button" disabled={pending} onClick={() => setEditing(false)} style={{ ...buttonStyle, background: "#475569" }}>
          Annuler
        </button>
      </div>
    </form>
  ) : (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      <button type="button" onClick={() => setEditing(true)} style={{ ...buttonStyle, background: "#1d4ed8" }}>
        Modifier
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Supprimer ce téléphone ?")) {
            startTransition(async () => deletePhoneAction(phone.id));
          }
        }}
        style={{ ...buttonStyle, background: "#991b1b" }}
      >
        Supprimer
      </button>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const inputStyle: React.CSSProperties = {
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#f8fafc",
  padding: "0 12px",
};

const buttonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 10,
  border: "none",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};
