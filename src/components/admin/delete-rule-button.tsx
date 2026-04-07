"use client";

import { useState } from "react";

export function DeleteRuleButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm("Supprimer cette règle?")) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/provisioning-rules/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Échec de la suppression");
      }

      // Rafraîchir la page
      window.location.reload();
    } catch (err) {
      console.error("Erreur suppression:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        style={{
          background: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "4px 12px",
          fontSize: "12px",
          cursor: "pointer",
          fontWeight: "600",
          opacity: isDeleting ? 0.7 : 1,
        }}
      >
        {isDeleting ? "Suppression..." : "Supprimer"}
      </button>
      {error && <p style={{ color: "#fca5a5", fontSize: "12px", marginTop: "4px" }}>{error}</p>}
    </>
  );
}