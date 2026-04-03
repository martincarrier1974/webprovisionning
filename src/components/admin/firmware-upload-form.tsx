"use client";

import { useState, useRef, useCallback } from "react";

type ModelOption = { id: string; displayName: string; vendor: string };

export function FirmwareUploadForm({ phoneModels, onSuccess }: { phoneModels: ModelOption[]; onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phoneModelId, setPhoneModelId] = useState("");
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setMsg(null); }
  }, []);

  async function submit() {
    if (!file || !phoneModelId || !version) {
      setMsg({ ok: false, text: "Fichier, modèle et version sont requis." });
      return;
    }
    setLoading(true);
    setMsg(null);
    setProgress(0);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("phoneModelId", phoneModelId);
      fd.append("version", version);
      fd.append("releaseNotes", releaseNotes);
      fd.append("isDefault", String(isDefault));

      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<{ ok: boolean; error?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { resolve({ ok: false, error: "Réponse invalide." }); }
        };
        xhr.onerror = () => reject(new Error("Erreur réseau."));
        xhr.open("POST", "/api/admin/firmwares/upload");
        xhr.send(fd);
      });

      if (result.ok) {
        setMsg({ ok: true, text: `✓ Firmware v${version} uploadé avec succès.` });
        setFile(null);
        setVersion("");
        setReleaseNotes("");
        setIsDefault(false);
        if (fileRef.current) fileRef.current.value = "";
        onSuccess?.();
      } else {
        setMsg({ ok: false, text: result.error ?? "Erreur upload." });
      }
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  const grouped = phoneModels.reduce<Record<string, ModelOption[]>>((acc, m) => {
    (acc[m.vendor] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--accent)" : "var(--card-border)"}`,
          borderRadius: 8, padding: "24px 16px", textAlign: "center", cursor: "pointer",
          background: dragOver ? "rgba(255,107,0,0.05)" : "transparent", transition: "all 0.15s",
        }}
      >
        <input ref={fileRef} type="file" style={{ display: "none" }}
          onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
        {file ? (
          <div>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📦</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(2)} MB — cliquer pour changer</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📂</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Glisser le fichier firmware ou <span style={{ color: "var(--accent)" }}>cliquer</span></div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>.bin · .rom · .img · .tar.gz · .zip</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="form-field">
          <label className="form-label">Modèle *</label>
          <select className="form-input" value={phoneModelId} onChange={e => setPhoneModelId(e.target.value)}>
            <option value="">Choisir un modèle</option>
            {Object.entries(grouped).map(([vendor, models]) => (
              <optgroup key={vendor} label={vendor}>
                {models.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Version *</label>
          <input className="form-input" value={version} onChange={e => setVersion(e.target.value)} placeholder="ex: 1.0.9.130" />
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Notes de version</label>
        <textarea className="form-input" value={releaseNotes} onChange={e => setReleaseNotes(e.target.value)} rows={3} placeholder="Optionnel..." />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
        <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
        Définir comme firmware par défaut pour ce modèle
      </label>

      {/* Progress */}
      {loading && progress !== null && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
            <span>Upload en cours...</span><span>{progress}%</span>
          </div>
          <div style={{ height: 4, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", transition: "width 0.2s", borderRadius: 99 }} />
          </div>
        </div>
      )}

      {msg && (
        <div style={{ padding: "8px 12px", borderRadius: 6, fontSize: 13,
          background: msg.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
          color: msg.ok ? "#4ade80" : "#f87171",
          border: `1px solid ${msg.ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
        }}>
          {msg.text}
        </div>
      )}

      <button className="btn btn-primary" onClick={submit} disabled={loading || !file || !phoneModelId || !version}>
        {loading ? "Upload en cours..." : "↑ Uploader le firmware"}
      </button>
    </div>
  );
}
