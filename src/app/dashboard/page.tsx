import { CreateUserForm } from "@/components/auth/create-user-form";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { logoutAction } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth/dal";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requireAdmin();
  const stats = await getDashboardSummary();
  const users = process.env.DATABASE_URL
    ? await db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        },
      })
    : [];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 24px 64px",
        background:
          "radial-gradient(circle at top, rgba(28, 100, 242, 0.12), transparent 32%), linear-gradient(180deg, #081120 0%, #0f172a 100%)",
        color: "#f8fafc",
      }}
    >
      <section style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 24 }}>
        <header
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ color: "#93c5fd", marginBottom: 8 }}>Dashboard admin</p>
            <h1 style={{ fontSize: 40, marginBottom: 8 }}>Bienvenue {user.firstName ?? user.email}</h1>
            <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
              Espace d’administration initial pour WebProvisionning.
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid rgba(148, 163, 184, 0.24)",
                background: "rgba(15, 23, 42, 0.78)",
                color: "#f8fafc",
                cursor: "pointer",
              }}
            >
              Déconnexion
            </button>
          </form>
        </header>

        <SummaryCards stats={stats} />

        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "1.2fr 1fr",
          }}
        >
          <article style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: "#93c5fd", marginBottom: 8 }}>Utilisateurs</p>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Ajouter un administrateur</h2>
              <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
                Première base pour créer et gérer les accès à la plateforme.
              </p>
            </div>
            <CreateUserForm />
          </article>

          <article style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: "#93c5fd", marginBottom: 8 }}>Derniers comptes</p>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Utilisateurs récents</h2>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {users.length === 0 ? (
                <p style={{ color: "#cbd5e1" }}>Aucun utilisateur disponible pour le moment.</p>
              ) : (
                users.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(148, 163, 184, 0.16)",
                      padding: 14,
                      background: "rgba(15, 23, 42, 0.52)",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {[item.firstName, item.lastName].filter(Boolean).join(" ") || item.email}
                    </div>
                    <div style={{ color: "#cbd5e1", marginTop: 4 }}>{item.email}</div>
                    <div style={{ color: "#93c5fd", marginTop: 6, fontSize: 14 }}>
                      {item.role} · {item.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

const panelStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(15, 23, 42, 0.78)",
  padding: 24,
};
