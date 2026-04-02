type Props = {
  inline?: boolean;
};

export function PhoneExportCard({ inline }: Props) {
  if (inline) {
    return (
      <a href="/api/admin/phones/export" className="btn btn-ghost">
        ↓ Exporter CSV
      </a>
    );
  }

  return (
    <article
      style={{
        borderRadius: 12,
        border: "1px solid var(--card-border)",
        background: "var(--card-bg)",
        padding: 20,
      }}
    >
      <p style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>CSV</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Exporter les téléphones</h2>
      <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14, fontSize: 13 }}>
        Exporte la liste des téléphones configurés en CSV.
      </p>
      <a href="/api/admin/phones/export" className="btn btn-primary">
        ↓ Télécharger CSV
      </a>
    </article>
  );
}
