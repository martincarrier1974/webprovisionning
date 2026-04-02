"use client";

import { useState, useTransition } from "react";

import { deleteSiteAction, updateSiteAction } from "@/app/actions/admin";

type ClientOption = {
  id: string;
  name: string;
};

type Props = {
  site: {
    id: string;
    clientId: string;
    name: string;
    slug: string;
    address: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    timezone: string | null;
  };
  clients: ClientOption[];
};

export function SiteManagementActions({ site, clients }: Props) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
      {editing ? (
        <form
          action={(formData) =>
            startTransition(async () => {
              await updateSiteAction(formData);
              setEditing(false);
            })
          }
          style={{ display: "grid", gap: 10 }}
        >
          <input type="hidden" name="id" value={site.id} />
          <select name="clientId" defaultValue={site.clientId} style={inputStyle}>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={labelStyle}>Nom du site</label>
              <input name="name" defaultValue={site.name} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={labelStyle}>Identifiant</label>
              <input name="slug" defaultValue={site.slug} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input name="address" defaultValue={site.address ?? ""} style={inputStyle} />
            <input name="city" defaultValue={site.city ?? ""} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <input name="province" defaultValue={site.province ?? ""} style={inputStyle} />
            <input name="country" defaultValue={site.country ?? "CA"} style={inputStyle} />
            <input name="timezone" defaultValue={site.timezone ?? ""} style={inputStyle} />
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setEditing(true)} style={{ ...buttonStyle, background: "#1d4ed8" }}>
            Modifier
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Supprimer ce site ?")) {
                startTransition(async () => deleteSiteAction(site.id));
              }
            }}
            style={{ ...buttonStyle, background: "#991b1b" }}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#888",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  fontWeight: 600,
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
