"use client";

import { useRef, useState, useCallback } from "react";

type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; mac: string; reason: string }[];
};

const CSV_TEMPLATE = `mac_address,client_slug,site_slug,model_code,label,extension_number,sip_username,sip_password,sip_server
AA:BB:CC:DD:EE:FF,bz-telecom,montreal,GXP2135,Bureau 101,101,101,secret,sip.example.com
`;

export function PhoneImportModal({ onClose }: { onClose: () => void }) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileDataRef = useRef<File | null>(null);

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-telephones.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(file: File) {
    fileDataRef.current = file;
    setFileName(file.name);
    setResult(null);
    setError(null);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  async function submit() {
    const file = fileDataRef.current ?? fileRef.current?.files?.[0];
    if (!file) { setError("Sélectionnez un fichier CSV."); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/phones/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Erreur import");
      setResult(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--card-bg)", border: "1px solid var(--card-border)",
        borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Importer des téléphones (CSV)</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", display: "grid", gap: 16 }}>
          {/* Template download */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,107,0,0.05)", border: "1px solid rgba(255,107,0,0.2)", borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>
              Colonnes requises : <code style={{ color: "var(--accent)" }}>mac_address</code>, <code style={{ color: "var(--accent)" }}>client_slug</code>, <code style={{ color: "var(--accent)" }}>model_code</code>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>↓ Modèle CSV</button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--accent)" : "var(--card-border)"}`,
              borderRadius: 8, padding: "32px 20px", textAlign: "center", cursor: "pointer",
              background: dragOver ? "rgba(255,107,0,0.05)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {fileName ? (
              <div>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{fileName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Cliquer pour changer</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
                <div style={{ fontSize: 14, color: "var(--muted)" }}>Glisser un fichier CSV ici ou <span style={{ color: "var(--accent)" }}>cliquer pour sélectionner</span></div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Résultats */}
          {result && (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 16, padding: "10px 14px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 600 }}>✓ {result.created} créé{result.created > 1 ? "s" : ""}</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{result.skipped} ignoré{result.skipped > 1 ? "s" : ""}</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{result.total} total</span>
              </div>
              {result.errors.length > 0 && (
                <div style={{ border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "8px 14px", background: "rgba(248,113,113,0.08)", fontSize: 12, fontWeight: 600, color: "#f87171" }}>
                    {result.errors.length} erreur{result.errors.length > 1 ? "s" : ""}
                  </div>
                  <div style={{ maxHeight: 140, overflowY: "auto" }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{ padding: "5px 14px", borderTop: "1px solid #1a1a1a", fontSize: 12, color: "#fca5a5" }}>
                        Ligne {e.row} — <code style={{ color: "var(--accent)" }}>{e.mac}</code> — {e.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--card-border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !fileName}>
            {loading ? "Importation..." : "Importer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Bouton déclencheur standalone
export function PhoneImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>↑ Importer CSV</button>
      {open && <PhoneImportModal onClose={() => setOpen(false)} />}
    </>
  );
}

// Compat ancien composant
export function PhoneImportForm() {
  return <PhoneImportButton />;
}
