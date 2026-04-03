"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PortalLoginForm({ clientSlug }: { clientSlug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, portalClientSlug: clientSlug }),
      });
      const json = await res.json();
      if (json.ok) {
        router.push(`/portal/${clientSlug}`);
        router.refresh();
      } else {
        setError(json.error ?? "Email ou mot de passe incorrect.");
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <div className="form-field">
        <label className="form-label">Adresse courriel</label>
        <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="form-field">
        <label className="form-label">Mot de passe</label>
        <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && (
        <div style={{ padding: "8px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
