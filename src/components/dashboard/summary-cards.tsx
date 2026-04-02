type SummaryCardsProps = {
  stats: {
    clients: number;
    sites: number;
    phoneModels: number;
    phones: number;
  };
};

const ITEMS = [
  { key: "clients" as const, label: "Clients", href: "/dashboard/clients" },
  { key: "sites" as const, label: "Sites", href: "/dashboard/sites" },
  { key: "phoneModels" as const, label: "Modèles", href: "#" },
  { key: "phones" as const, label: "Téléphones", href: "/dashboard/phones" },
];

export function SummaryCards({ stats }: SummaryCardsProps) {
  return (
    <>
      {ITEMS.map((item) => (
        <a key={item.key} href={item.href} className="stat-card" style={{ textDecoration: "none", display: "block" }}>
          <div className="stat-card-label">{item.label}</div>
          <div className="stat-card-value">{stats[item.key]}</div>
        </a>
      ))}
    </>
  );
}
