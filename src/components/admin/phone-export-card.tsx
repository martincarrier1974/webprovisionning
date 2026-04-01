export function PhoneExportCard() {
  return (
    <article
      style={{
        borderRadius: 24,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(15, 23, 42, 0.78)",
        padding: 24,
      }}
    >
      <p style={{ color: "#93c5fd", marginBottom: 8 }}>CSV</p>
      <h2 style={{ fontSize: 24, marginBottom: 8 }}>Exporter les téléphones</h2>
      <p style={{ color: "#cbd5e1", lineHeight: 1.7, marginBottom: 14 }}>
        Exporte la liste des téléphones configurés en CSV pour audit ou import externe.
      </p>
      <a
        href="/api/admin/phones/export"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          padding: "0 16px",
          borderRadius: 12,
          background: "#2563eb",
          color: "white",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Télécharger CSV
      </a>
    </article>
  );
}
