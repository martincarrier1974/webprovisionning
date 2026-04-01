"use client";

import { useTransition } from "react";

import { deletePhoneAction } from "@/app/actions/admin";

export function PhoneManagementActions({ phoneId }: { phoneId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Supprimer ce téléphone ?")) {
            startTransition(async () => deletePhoneAction(phoneId));
          }
        }}
        style={buttonStyle}
      >
        Supprimer
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 10,
  border: "none",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  background: "#991b1b",
};
