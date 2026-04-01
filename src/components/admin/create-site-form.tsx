"use client";

import { useActionState } from "react";

import { createSiteAction } from "@/app/actions/admin";

type ClientOption = {
  id: string;
  name: string;
  slug: string;
};

const initialState = undefined;

export function CreateSiteForm({ clients }: { clients: ClientOption[] }) {
  const [state, action, pending] = useActionState(createSiteAction, initialState);

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <select name="clientId" required style={inputStyle} defaultValue="">
        <option value="" disabled>
          Choisir un client
        </option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name} ({client.slug})
          </option>
        ))}
      </select>

      <div style={gridStyle}>
        <input name="name" placeholder="Nom du site" required style={inputStyle} />
        <input name="slug" placeholder="Slug du site" required style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <input name="address" placeholder="Adresse" style={inputStyle} />
        <input name="city" placeholder="Ville" style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <input name="province" placeholder="Province" style={inputStyle} />
        <input name="country" defaultValue="CA" placeholder="Pays" style={inputStyle} />
      </div>

      <input name="timezone" defaultValue="America/Toronto" placeholder="Fuseau horaire" style={inputStyle} />

      {state?.error ? <p style={{ color: "#fca5a5" }}>{state.error}</p> : null}
      {state?.success ? <p style={{ color: "#86efac" }}>{state.success}</p> : null}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Création..." : "Ajouter le site"}
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
