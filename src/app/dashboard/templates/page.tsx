import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { TemplatesClient } from "@/components/templates/templates-client";

export default async function TemplatesPage() {
  await requireAdmin();

  const templates = await db.phoneTemplate.findMany({
    include: {
      rules: { orderBy: { sortOrder: "asc" } },
      _count: { select: { sites: true, phones: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="dashboard-content">
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">Templates de provisioning</span>
      </div>
      <TemplatesClient templates={templates} />
    </div>
  );
}
