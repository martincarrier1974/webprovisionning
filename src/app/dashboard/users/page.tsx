import { CreateUserForm } from "@/components/auth/create-user-form";
import { UserManagementActions } from "@/components/auth/user-management-actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export default async function UsersPage() {
  const currentUser = await requireAdmin();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true },
  });

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">Utilisateurs</span>
      </div>
      <div className="dashboard-content">
        <div className="grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="card-title">Nouveau</div>
            <div className="card-heading">Ajouter un administrateur</div>
            <p className="card-desc">Crée un accès à la plateforme de provisioning.</p>
            <CreateUserForm />
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <div className="card-title">Comptes</div>
                <div className="section-title">{users.length} utilisateur(s)</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {users.map((u) => (
                <div key={u.id} className="item-row" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div className="item-row-info">
                    <div className="item-row-title">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                    </div>
                    <div className="item-row-sub">{u.email} · {u.role}</div>
                  </div>
                  <span className="item-row-badge" style={{
                    background: u.status === "ACTIVE" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                    color: u.status === "ACTIVE" ? "#4ade80" : "#f87171",
                  }}>
                    {u.status}
                  </span>
                  <UserManagementActions userId={u.id} status={u.status} isCurrentUser={u.id === currentUser.id} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
