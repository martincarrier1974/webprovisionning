"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";

type Props = {
  user: { email: string; firstName?: string | null };
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "◈" },
  { href: "/dashboard/clients", label: "Clients", icon: "⊞" },
  { href: "/dashboard/sites", label: "Sites", icon: "⊟" },
  { href: "/dashboard/phones", label: "Téléphones", icon: "☎" },
  { href: "/dashboard/firmwares", label: "Firmwares", icon: "⊙" },
  { href: "/dashboard/rules", label: "Règles provision.", icon: "⊛" },
  { href: "/dashboard/logs", label: "Logs", icon: "≡" },
  { href: "/dashboard/users", label: "Utilisateurs", icon: "⊕" },
];

export function DashboardSidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <nav className="dashboard-sidebar">
      <div className="dashboard-sidebar-logo">
        <span>Web<span className="accent">Prov</span></span>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          {user.firstName ?? user.email}
        </div>
      </div>

      <div className="dashboard-sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)) ? "active" : ""}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="dashboard-sidebar-footer">
        <form action={logoutAction}>
          <button type="submit" className="dashboard-sidebar-nav" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, color: "var(--muted)", fontSize: 14, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ fontSize: 16 }}>⊗</span>
            Déconnexion
          </button>
        </form>
      </div>
    </nav>
  );
}
