import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { requireAdmin } from "@/lib/auth/dal";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="dashboard-shell">
      <DashboardSidebar user={{ email: user.email, firstName: user.firstName }} />
      <div className="dashboard-main">
        {children}
      </div>
    </div>
  );
}
