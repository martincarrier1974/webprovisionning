"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/actions/auth";

const initialState = undefined;

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="email">Adresse courriel</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="admin@exemple.com"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          style={inputStyle}
        />
      </div>

      {state?.error ? <p style={{ color: "#fca5a5" }}>{state.error}</p> : null}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}

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
