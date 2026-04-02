"use client";

import { useActionState } from "react";

import { createClientAction } from "@/app/actions/admin";

const initialState = undefined;

export function CreateClientForm() {
  const [state, action, pending] = useActionState(createClientAction, initialState);

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <div style={gridStyle}>
        <input name="name" placeholder="Nom du client" required style={inputStyle} />
        <input name="slug" placeholder="Identifiant (ex: client-demo)" required style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <select name="defaultLanguage" defaultValue="fr" style={inputStyle}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>

        <input name="timezone" defaultValue="America/Toronto" placeholder="Fuseau horaire" required style={inputStyle} />
      </div>

      <textarea name="notes" placeholder="Notes internes (optionnel)" rows={4} style={{ ...inputStyle, padding: 14 }} />

      {state?.error ? <p style={{ color: "#fca5a5" }}>{state.error}</p> : null}
      {state?.success ? <p style={{ color: "#86efac" }}>{state.success}</p> : null}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Création..." : "Ajouter le client"}
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
