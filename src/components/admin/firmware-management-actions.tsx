"use client";

import { useState, useTransition } from "react";

import { deleteFirmwareAction, updateFirmwareAction } from "@/app/actions/admin";

type Props = {
  firmware: {
    id: string;
    phoneModelId: string;
    version: string;
    storageKey: string;
    originalName: string;
    checksumSha256: string | null;
    releaseNotes: string | null;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    isDefault: boolean;
  };
};

export function FirmwareManagementActions({ firmware }: Props) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
      {editing ? (
        <form
          action={(formData) =>
            startTransition(async () => {
              await updateFirmwareAction(formData);
              setEditing(false);
            })
          }
          style={{ display: "grid", gap: 10 }}
        >
          <input type="hidden" name="id" value={firmware.id} />
          <input type="hidden" name="phoneModelId" value={firmware.phoneModelId} />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input name="version" defaultValue={firmware.version} style={inputStyle} />
            <input name="storageKey" defaultValue={firmware.storageKey} style={inputStyle} />
          </div>
          <input name="originalName" defaultValue={firmware.originalName} style={inputStyle} />
          <input name="checksumSha256" defaultValue={firmware.checksumSha256 ?? ""} style={inputStyle} />
          <textarea name="releaseNotes" defaultValue={firmware.releaseNotes ?? ""} rows={3} style={{ ...inputStyle, padding: 12 }} />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <select name="status" defaultValue={firmware.status} style={inputStyle}>
              <option value="DRAFT">Brouillon</option>
              <option value="ACTIVE">Actif</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#f8fafc" }}>
              <input name="isDefault" type="checkbox" defaultChecked={firmware.isDefault} />
              Firmware par défaut
            </label>
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
              if (window.confirm("Supprimer ce firmware ?")) {
                startTransition(async () => deleteFirmwareAction(firmware.id));
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
