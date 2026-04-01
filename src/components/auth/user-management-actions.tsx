"use client";

import { useTransition } from "react";

import { deleteUserAction, disableUserAction, enableUserAction } from "@/app/actions/auth";

type Props = {
  userId: string;
  isCurrentUser: boolean;
  status: "ACTIVE" | "INVITED" | "DISABLED";
};

export function UserManagementActions({ userId, isCurrentUser, status }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {status !== "DISABLED" ? (
        <button
          type="button"
          disabled={pending || isCurrentUser}
          onClick={() => startTransition(async () => disableUserAction(userId))}
          style={{ ...buttonStyle, background: "#7c2d12" }}
        >
          Désactiver
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => enableUserAction(userId))}
          style={{ ...buttonStyle, background: "#166534" }}
        >
          Réactiver
        </button>
      )}

      <button
        type="button"
        disabled={pending || isCurrentUser}
        onClick={() => {
          if (window.confirm("Supprimer définitivement cet utilisateur ?")) {
            startTransition(async () => deleteUserAction(userId));
          }
        }}
        style={{ ...buttonStyle, background: "#991b1b" }}
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
};
