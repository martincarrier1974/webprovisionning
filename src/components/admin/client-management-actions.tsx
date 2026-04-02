"use client";

import { useState, useTransition } from "react";

import { deleteClientAction, updateClientAction } from "@/app/actions/admin";

type Props = {
  client: {
    id: string;
    name: string;
    slug: string;
    defaultLanguage: string;
    timezone: string;
    notes: string | null;
  };
};

export function ClientManagementActions({ client }: Props) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
      {editing ? (
        <form
          action={(formData) =>
            startTransition(async () => {
              await updateClientAction(formData);
              setEditing(false);
            })
          }
          style={{ display: "grid", gap: 10 }}
        >
          <input type="hidden" name="id" value={client.id} />
          <input name="name" defaultValue={client.name} style={inputStyle} />
          <input name="slug" defaultValue={client.slug} placeholder="Identifiant" style={inputStyle} />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <select name="defaultLanguage" defaultValue={client.defaultLanguage} style={inputStyle}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
            <input name="timezone" defaultValue={client.timezone} style={inputStyle} />
          </div>
          <textarea name="notes" defaultValue={client.notes ?? ""} rows={3} style={{ ...inputStyle, padding: 12 }} />
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
              if (window.confirm("Supprimer ce client ?")) {
                startTransition(async () => deleteClientAction(client.id));
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
