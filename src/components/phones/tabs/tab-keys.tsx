"use client";

import { useState, useEffect } from "react";

type Key = {
  id?: string;
  keyIndex: number;
  account: string;
  description: string;
  mode: string;
  locked: boolean;
  value: string;
};

type Phone = {
  id: string;
  phoneModel: {
    vendor: string;
    modelCode: string;
    lineCapacity?: number | null;
  };
};

const MODES = [
  { value: "DEFAULT", label: "Défaut" },
  { value: "BLF", label: "BLF (supervision)" },
  { value: "SPEED_DIAL", label: "Numérotation rapide" },
  { value: "CALL_PARK", label: "Parcage d'appel" },
  { value: "INTERCOM", label: "Interphone" },
  { value: "FORWARD", label: "Renvoi" },
  { value: "DND", label: "Ne pas déranger" },
  { value: "RECORD", label: "Enregistrement" },
  { value: "NONE", label: "Aucun" },
];

// Modèles Grandstream supportant les VMPK
const VMPK_MODELS = ["GXP2130", "GXP2135", "GXP1610", "GXP1615", "GXP1620", "GXP1625", "GXP1628", "GXP1630"];
const VMPK_CAPACITY = 16; // max VMPK pour GXP2130/2135

function emptyKey(index: number): Key {
  return { keyIndex: index, account: "Account1", description: "", mode: "DEFAULT", locked: false, value: "" };
}

type Props = {
  phone: Phone;
  initialKeys: Key[];
};

function KeysTable({
  keys,
  startIndex,
  onChange,
  label,
  accentColor,
}: {
  keys: Key[];
  startIndex: number;
  onChange: (i: number, field: keyof Key, val: string | boolean) => void;
  label: string;
  accentColor?: string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ padding: "10px 20px", background: "#111", borderBottom: "1px solid var(--card-border)", borderTop: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: accentColor ?? "var(--muted)" }}>{label}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0d0d0d", borderBottom: "1px solid var(--card-border)" }}>
              {["#", "Compte", "Description", "Mode", "Verrouillé", "Valeur"].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key, i) => (
              <tr key={key.keyIndex} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                <td style={{ padding: "6px 12px", color: "var(--muted)", fontWeight: 600 }}>{key.keyIndex}</td>
                <td style={{ padding: "6px 8px" }}>
                  <select className="form-input" style={{ padding: "4px 8px", fontSize: 12 }} value={key.account} onChange={e => onChange(startIndex + i, "account", e.target.value)}>
                    {Array.from({ length: 6 }, (_, n) => (
                      <option key={n} value={`Account${n + 1}`}>Compte {n + 1}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input className="form-input" style={{ padding: "4px 8px", fontSize: 12 }} value={key.description} onChange={e => onChange(startIndex + i, "description", e.target.value)} placeholder="Description" />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <select className="form-input" style={{ padding: "4px 8px", fontSize: 12 }} value={key.mode} onChange={e => onChange(startIndex + i, "mode", e.target.value)}>
                    {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </td>
                <td style={{ padding: "6px 12px", textAlign: "center" }}>
                  <input type="checkbox" checked={key.locked} onChange={e => onChange(startIndex + i, "locked", e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input className="form-input" style={{ padding: "4px 8px", fontSize: 12 }} value={key.value} onChange={e => onChange(startIndex + i, "value", e.target.value)} placeholder="ex: 1002" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TabKeys({ phone, initialKeys }: Props) {
  // Fonction pour recharger les touches depuis l'API
  const reloadKeys = async () => {
    try {
      const res = await fetch(`/api/admin/phones/${phone.id}/keys`);
      const data = await res.json();
      if (data.ok) {
        // Convertir les touches de l'API au format attendu
        const reloadedKeys = data.data.map((k: any) => ({
          id: k.id,
          keyIndex: k.keyIndex,
          account: k.account || "Account1",
          description: k.description || "",
          mode: k.mode,
          locked: k.locked,
          value: k.value || "",
        }));
        
        // Reconstruire le tableau keys avec les touches rechargées
        const filled = [...reloadedKeys];
        for (let i = filled.length; i < totalCapacity; i++) filled.push(emptyKey(i + 1));
        const sortedKeys = filled.sort((a, b) => a.keyIndex - b.keyIndex);
        
        setKeys(sortedKeys);
        
        // Mettre à jour enabled et vmpkEnabled
        const hasConfiguredKeys = sortedKeys.some(k => k.mode !== "DEFAULT" && k.mode !== "NONE");
        setEnabled(hasConfiguredKeys);
        
        if (supportsVmpk) {
          const hasConfiguredVmpk = sortedKeys.some(k => 
            k.keyIndex > physicalCapacity && 
            k.mode !== "DEFAULT" && 
            k.mode !== "NONE"
          );
          setVmpkEnabled(hasConfiguredVmpk);
        }
      }
    } catch (error) {
      console.error("Erreur rechargement touches:", error);
    }
  };
  const physicalCapacity = phone.phoneModel.lineCapacity ?? 0;
  const modelCode = phone.phoneModel.modelCode?.toUpperCase() ?? "";
  const isGrandstream = phone.phoneModel.vendor === "GRANDSTREAM";
  const supportsVmpk = isGrandstream && VMPK_MODELS.includes(modelCode);

  const totalCapacity = supportsVmpk ? physicalCapacity + VMPK_CAPACITY : physicalCapacity;

  const [enabled, setEnabled] = useState(initialKeys.length > 0);
  const [vmpkEnabled, setVmpkEnabled] = useState(
    supportsVmpk && initialKeys.some(k => k.keyIndex > physicalCapacity)
  );

  const [keys, setKeys] = useState<Key[]>(() => {
    const filled = [...initialKeys];
    for (let i = filled.length; i < totalCapacity; i++) filled.push(emptyKey(i + 1));
    return filled.sort((a, b) => a.keyIndex - b.keyIndex);
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function updateKey(index: number, field: keyof Key, val: string | boolean) {
    setKeys(prev => prev.map((k, i) => i === index ? { ...k, [field]: val } : k));
  }

  // Mettre à jour 'enabled' automatiquement quand des touches sont configurées
  useEffect(() => {
    const hasConfiguredKeys = keys.some(k => k.mode !== "DEFAULT" && k.mode !== "NONE");
    if (hasConfiguredKeys !== enabled) {
      setEnabled(hasConfiguredKeys);
    }
    
    // Mettre à jour vmpkEnabled automatiquement si une touche VMPK est configurée
    if (supportsVmpk) {
      const hasConfiguredVmpk = keys.some(k => 
        k.keyIndex > physicalCapacity && 
        k.mode !== "DEFAULT" && 
        k.mode !== "NONE"
      );
      if (hasConfiguredVmpk !== vmpkEnabled) {
        setVmpkEnabled(hasConfiguredVmpk);
      }
    }
  }, [keys, supportsVmpk, physicalCapacity]); // removed enabled and vmpkEnabled from dependencies

  function selectAll() {
    setKeys(prev => prev.map(k => ({ ...k, mode: "BLF" })));
  }

  function resetAll() {
    setKeys(Array.from({ length: totalCapacity }, (_, i) => emptyKey(i + 1)));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      // N'envoyer que les touches pertinentes selon ce qui est activé
      // Si physicalCapacity est 0/null (modèle sans capacité définie), envoyer toutes les touches configurées
      
      // CORRECTION: Toujours envoyer toutes les touches configurées pour éviter la perte de données
      // Filtrer seulement les touches qui ont réellement été configurées (mode non DEFAULT/NONE)
      const activeKeys = keys.filter(k => k.mode !== "DEFAULT" && k.mode !== "NONE");
      
      const res = await fetch(`/api/admin/phones/${phone.id}/keys`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          enabled: activeKeys.length > 0, // Activer seulement si au moins une touche configurée
          keys: activeKeys 
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setMsg({ ok: true, text: "Sauvegardé & appliqué." });
        // Recharger les touches depuis l'API pour synchroniser avec la DB
        await reloadKeys();
      } else {
        setMsg({ ok: false, text: json.error ?? "Erreur." });
      }
    } catch {
      setMsg({ ok: false, text: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  }

  const physicalKeys = keys.slice(0, physicalCapacity);
  const vmpkKeys = keys.slice(physicalCapacity);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="card-title" style={{ marginBottom: 2 }}>Touches programmables</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {phone.phoneModel.vendor} {modelCode} ·{" "}
            {physicalCapacity > 0 ? `${physicalCapacity} MPK physiques` : "Aucun MPK physique"}
            {supportsVmpk ? ` + ${VMPK_CAPACITY} VMPK disponibles` : ""}
            {isGrandstream && (
              <span style={{ display: "block", marginTop: 6, fontSize: 12 }}>
                Après <strong>Sauvegarder</strong>, lancez <strong>Provision</strong> sur le poste (ou un reboot) : les touches sont dans le fichier XML ; le téléphone doit le télécharger à nouveau.
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            Activer les touches
          </label>
          {supportsVmpk && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", color: vmpkEnabled ? "#f97316" : "var(--muted)" }}>
              <input
                type="checkbox"
                checked={vmpkEnabled}
                onChange={e => setVmpkEnabled(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#f97316", cursor: "pointer" }}
              />
              Activer les VMPK ({VMPK_CAPACITY} touches virtuelles)
            </label>
          )}
        </div>
      </div>

      {/* MPK physiques */}
      {physicalCapacity > 0 && (
        <KeysTable
          keys={physicalKeys}
          startIndex={0}
          onChange={updateKey}
          label={`MPK Physiques (${physicalCapacity})`}
          accentColor="var(--accent)"
        />
      )}

      {/* VMPK */}
      {supportsVmpk && vmpkEnabled && (
        <KeysTable
          keys={vmpkKeys}
          startIndex={physicalCapacity}
          onChange={updateKey}
          label={`VMPK — Touches virtuelles (${VMPK_CAPACITY})`}
          accentColor="#f97316"
        />
      )}

      {/* Cas: pas de MPK physique et pas VMPK activé */}
      {physicalCapacity === 0 && !vmpkEnabled && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          {supportsVmpk ? "Activez les VMPK pour configurer les touches virtuelles." : "Ce modèle ne supporte pas les touches programmables."}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "14px 20px", borderTop: "1px solid var(--card-border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={selectAll}>Sélectionner tout (BLF)</button>
        <button className="btn btn-ghost btn-sm" onClick={resetAll}>Réinitialiser</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
          <a href={`/dashboard/phones/${phone.id}`} className="btn btn-ghost btn-sm">Retour</a>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Sauvegarde..." : "Sauvegarder & Appliquer"}
          </button>
        </div>
      </div>
    </div>
  );
}
