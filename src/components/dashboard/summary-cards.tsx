type SummaryCardsProps = {
  stats: {
    clients: number;
    sites: number;
    phoneModels: number;
    phones: number;
  };
};

const items = [
  { key: "clients", label: "Clients" },
  { key: "sites", label: "Sites" },
  { key: "phoneModels", label: "Modèles" },
  { key: "phones", label: "Téléphones" },
] as const;

export function SummaryCards({ stats }: SummaryCardsProps) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      {items.map((item) => (
        <article
          key={item.key}
          style={{
            border: "1px solid rgba(148, 163, 184, 0.18)",
            background: "rgba(15, 23, 42, 0.72)",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <div style={{ color: "#93c5fd", fontSize: 13, marginBottom: 10 }}>{item.label}</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>{stats[item.key]}</div>
        </article>
      ))}
    </div>
  );
}
