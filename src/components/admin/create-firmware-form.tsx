"use client";

import { useActionState } from "react";

import { createFirmwareAction } from "@/app/actions/admin";

type ModelOption = {
  id: string;
  displayName: string;
  vendor: string;
};

const initialState = undefined;

export function CreateFirmwareForm({ phoneModels }: { phoneModels: ModelOption[] }) {
  const [state, action, pending] = useActionState(createFirmwareAction, initialState);

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
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
        <input name="version" placeholder="Version" required style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <input name="storageKey" placeholder="Storage key / chemin objet" required style={inputStyle} />
        <input name="originalName" placeholder="Nom original du fichier" required style={inputStyle} />
      </div>

      <div style={gridStyle}>
        <input name="checksumSha256" placeholder="SHA256 (optionnel)" style={inputStyle} />
        <select name="status" defaultValue="DRAFT" style={inputStyle}>
          <option value="DRAFT">Brouillon</option>
          <option value="ACTIVE">Actif</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
      </div>

      <textarea name="releaseNotes" placeholder="Notes de version" rows={4} style={{ ...inputStyle, padding: 12 }} />

      <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#f8fafc" }}>
        <input name="isDefault" type="checkbox" />
        Firmware par défaut
      </label>

      {state?.error ? <p style={{ color: "#fca5a5" }}>{state.error}</p> : null}
      {state?.success ? <p style={{ color: "#86efac" }}>{state.success}</p> : null}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Création..." : "Ajouter le firmware"}
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
