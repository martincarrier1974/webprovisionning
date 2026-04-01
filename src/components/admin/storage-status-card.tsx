type Props = {
  storage: {
    configured: boolean;
    bucket: string | null;
    endpoint: string | null;
    provider: string | null;
  };
};

export function StorageStatusCard({ storage }: Props) {
  return (
    <article
      style={{
        borderRadius: 24,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(15, 23, 42, 0.78)",
        padding: 24,
      }}
    >
      <p style={{ color: "#93c5fd", marginBottom: 8 }}>Stockage objet</p>
      <h2 style={{ fontSize: 24, marginBottom: 8 }}>État du stockage firmware</h2>
      <p style={{ color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
        {storage.configured
          ? "Le stockage objet est configuré et prêt à servir les firmwares."
          : "Le stockage objet n’est pas encore configuré. Les firmwares restent déclaratifs pour l’instant."}
      </p>
      <div style={{ display: "grid", gap: 8, color: "#e2e8f0" }}>
        <div>Provider: {storage.provider ?? "—"}</div>
        <div>Bucket: {storage.bucket ?? "—"}</div>
        <div>Endpoint: {storage.endpoint ?? "—"}</div>
      </div>
    </article>
  );
}
