import { CreateUserForm } from "@/components/auth/create-user-form";
import { UserManagementActions } from "@/components/auth/user-management-actions";
import { CreateClientForm } from "@/components/admin/create-client-form";
import { CreatePhoneForm } from "@/components/admin/create-phone-form";
import { PhoneManagementActions } from "@/components/admin/phone-management-actions";
import { CreateSiteForm } from "@/components/admin/create-site-form";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { logoutAction } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth/dal";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requireAdmin();
  const stats = await getDashboardSummary();

  const [users, clients, sites, phoneModels, phones] = process.env.DATABASE_URL
    ? await Promise.all([
        db.user.findMany({
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
        }),
        db.client.findMany({
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: {
                sites: true,
                phones: true,
              },
            },
          },
        }),
        db.site.findMany({
          orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
          include: {
            client: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            _count: {
              select: {
                phones: true,
              },
            },
          },
        }),
        db.phoneModel.findMany({
          where: { isActive: true },
          orderBy: [{ vendor: "asc" }, { displayName: "asc" }],
          select: {
            id: true,
            vendor: true,
            modelCode: true,
            displayName: true,
          },
        }),
        db.phone.findMany({
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            site: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            phoneModel: {
              select: {
                id: true,
                vendor: true,
                modelCode: true,
                displayName: true,
              },
            },
          },
        }),
      ])
    : [[], [], [], [], []];

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
            <button type="submit" style={secondaryButtonStyle}>
              Déconnexion
            </button>
          </form>
        </header>

        <SummaryCards stats={stats} />

        <section style={threeColSectionStyle}>
          <article style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: "#93c5fd", marginBottom: 8 }}>Clients</p>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Ajouter un client</h2>
              <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
                Crée une organisation pour regrouper sites, téléphones et utilisateurs.
              </p>
            </div>
            <CreateClientForm />
          </article>

          <article style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: "#93c5fd", marginBottom: 8 }}>Sites</p>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Ajouter un site</h2>
              <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
                Ajoute une succursale ou un emplacement pour un client existant.
              </p>
            </div>
            <CreateSiteForm
              clients={clients.map((client) => ({
                id: client.id,
                name: client.name,
                slug: client.slug,
              }))}
            />
          </article>

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
        </section>

        <section style={singleSectionStyle}>
          <article style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: "#93c5fd", marginBottom: 8 }}>Téléphones</p>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Ajouter un téléphone</h2>
              <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
                Associe un téléphone à un client, un site et un modèle précis.
              </p>
            </div>
            <CreatePhoneForm
              clients={clients.map((client) => ({ id: client.id, name: client.name }))}
              sites={sites.map((site) => ({ id: site.id, name: site.name, clientId: site.client.id }))}
              phoneModels={phoneModels.map((model) => ({
                id: model.id,
                displayName: model.displayName,
                vendor: model.vendor,
                modelCode: model.modelCode,
              }))}
            />
          </article>
        </section>

        <section style={twoColSectionStyle}>
          <article style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: "#93c5fd", marginBottom: 8 }}>Clients récents</p>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Clients configurés</h2>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {clients.length === 0 ? (
                <p style={{ color: "#cbd5e1" }}>Aucun client pour le moment.</p>
              ) : (
                clients.map((client) => (
                  <div key={client.id} style={itemCardStyle}>
                    <div style={{ fontWeight: 700 }}>{client.name}</div>
                    <div style={{ color: "#cbd5e1", marginTop: 4 }}>{client.slug}</div>
                    <div style={{ color: "#93c5fd", marginTop: 6, fontSize: 14 }}>
                      {client._count.sites} site(s) · {client._count.phones} téléphone(s)
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: "#93c5fd", marginBottom: 8 }}>Sites récents</p>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Sites configurés</h2>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {sites.length === 0 ? (
                <p style={{ color: "#cbd5e1" }}>Aucun site pour le moment.</p>
              ) : (
                sites.map((site) => (
                  <div key={site.id} style={itemCardStyle}>
                    <div style={{ fontWeight: 700 }}>{site.name}</div>
                    <div style={{ color: "#cbd5e1", marginTop: 4 }}>
                      {site.client.name} · {site.slug}
                    </div>
                    <div style={{ color: "#93c5fd", marginTop: 6, fontSize: 14 }}>
                      {site._count.phones} téléphone(s)
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section style={twoColSectionStyle}>
          <article style={panelStyle}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: "#93c5fd", marginBottom: 8 }}>Téléphones récents</p>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Téléphones configurés</h2>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {phones.length === 0 ? (
                <p style={{ color: "#cbd5e1" }}>Aucun téléphone pour le moment.</p>
              ) : (
                phones.map((phone) => (
                  <div key={phone.id} style={itemCardStyle}>
                    <div style={{ fontWeight: 700 }}>{phone.label || phone.macAddress}</div>
                    <div style={{ color: "#cbd5e1", marginTop: 4 }}>
                      {phone.phoneModel.vendor} · {phone.phoneModel.displayName}
                    </div>
                    <div style={{ color: "#cbd5e1", marginTop: 4 }}>
                      {phone.client.name}
                      {phone.site ? ` · ${phone.site.name}` : ""}
                    </div>
                    <div style={{ color: "#93c5fd", marginTop: 6, fontSize: 14 }}>
                      MAC {phone.macAddress} · {phone.status}
                    </div>
                    <PhoneManagementActions phoneId={phone.id} />
                  </div>
                ))
              )}
            </div>
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
                  <div key={item.id} style={itemCardStyle}>
                    <div style={{ fontWeight: 700 }}>
                      {[item.firstName, item.lastName].filter(Boolean).join(" ") || item.email}
                    </div>
                    <div style={{ color: "#cbd5e1", marginTop: 4 }}>{item.email}</div>
                    <div style={{ color: "#93c5fd", marginTop: 6, fontSize: 14 }}>
                      {item.role} · {item.status}
                    </div>
                    <UserManagementActions
                      userId={item.id}
                      status={item.status}
                      isCurrentUser={item.id === user.id}
                    />
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

const itemCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  padding: 14,
  background: "rgba(15, 23, 42, 0.52)",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.24)",
  background: "rgba(15, 23, 42, 0.78)",
  color: "#f8fafc",
  cursor: "pointer",
};

const threeColSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
};

const twoColSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const singleSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
};
