"use client";

import { useRef, useState } from "react";

type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; mac: string; reason: string }[];
};

export function PhoneImportForm() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Sélectionnez un fichier CSV.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/phones/import", { method: "POST", body: fd });
      const json = await res.json();

      if (!json.ok) {
        setError(json.error || "Erreur lors de l'import.");
      } else {
        setResult(json.data);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ color: "#f8fafc", background: "rgba(15,23,42,0.6)", borderRadius: 8, padding: "8px 10px", border: "1px solid rgba(148,163,184,0.24)" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, background: "#2563eb", color: "white", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Importation..." : "Importer CSV"}
        </button>
      </form>

      {error && (
        <p style={{ color: "#f87171", marginTop: 12 }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
          <p style={{ color: "#4ade80" }}>✓ {result.created} créé(s) · {result.skipped} ignoré(s) · {result.total} total</p>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ color: "#f87171", marginBottom: 6 }}>Erreurs ({result.errors.length}) :</p>
              {result.errors.map((e, i) => (
                <div key={i} style={{ color: "#fca5a5", fontSize: 13 }}>Ligne {e.row} ({e.mac}) — {e.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
