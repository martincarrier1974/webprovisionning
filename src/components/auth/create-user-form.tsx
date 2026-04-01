"use client";

import { useActionState } from "react";

import { createUserAction } from "@/app/actions/auth";

const initialState = undefined;

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialState);

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <div style={gridStyle}>
        <input name="firstName" placeholder="Prénom" required style={inputStyle} />
        <input name="lastName" placeholder="Nom" required style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <input name="email" type="email" placeholder="Courriel" required style={inputStyle} />
        <input name="password" type="password" placeholder="Mot de passe temporaire" required style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <select name="role" defaultValue="ADMIN" style={inputStyle}>
          <option value="SUPER_ADMIN">Super admin</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="VIEWER">Viewer</option>
        </select>

        <select name="locale" defaultValue="fr" style={inputStyle}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      {state?.error ? <p style={{ color: "#fca5a5" }}>{state.error}</p> : null}
      {state?.success ? <p style={{ color: "#86efac" }}>{state.success}</p> : null}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Création..." : "Ajouter l’utilisateur"}
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
