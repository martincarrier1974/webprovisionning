import { db } from "@/lib/db";

export type DashboardSummary = {
  phones: { total: number; active: number; staged: number; disabled: number };
  clients: number;
  sites: number;
  provisioning: { last24h: number; errors24h: number; lastActivity: Date | null };
  recentErrors: { macAddress: string; label: string | null; message: string | null; createdAt: Date }[];
  recentLogs: {
    id: string; success: boolean; vendor: string; macAddress: string;
    message: string | null; createdAt: Date;
    phone: { id: string; label: string | null } | null;
  }[];
  recentPhones: {
    id: string; label: string | null; macAddress: string; status: string;
    lastProvisionedAt: Date | null;
    phoneModel: { vendor: string; displayName: string };
    client: { name: string };
    site: { name: string } | null;
  }[];
  activityByDay: { date: string; ok: number; err: number }[];
};

export async function getDashboardSummary(clientId?: string): Promise<DashboardSummary> {
  const where = clientId ? { clientId } : {};
  const logWhere = clientId ? { phone: { clientId } } : {};
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);

  const [
    phoneCounts,
    clientCount,
    siteCount,
    logs24h,
    recentErrors,
    recentLogs,
    recentPhones,
    activity7d,
  ] = await Promise.all([
    db.phone.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.client.count(),
    db.site.count(),
    db.provisionLog.findMany({
      where: { ...logWhere, createdAt: { gte: since24h } },
      select: { success: true, createdAt: true },
    }),
    db.provisionLog.findMany({
      where: { ...logWhere, success: false, createdAt: { gte: since24h } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { phone: { select: { label: true } } },
    }),
    db.provisionLog.findMany({
      where: logWhere,
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { phone: { select: { id: true, label: true } } },
    }),
    db.phone.findMany({
      where,
      orderBy: { lastProvisionedAt: "desc" },
      take: 8,
      include: {
        phoneModel: { select: { vendor: true, displayName: true } },
        client: { select: { name: true } },
        site: { select: { name: true } },
      },
    }),
    db.provisionLog.findMany({
      where: { ...logWhere, createdAt: { gte: since7d } },
      select: { success: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const byStatus = Object.fromEntries(phoneCounts.map(g => [g.status, g._count._all]));

  // Build activity by day (last 7 days)
  const dayMap = new Map<string, { ok: number; err: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayMap.set(d.toISOString().slice(0, 10), { ok: 0, err: 0 });
  }
  for (const log of activity7d) {
    const day = log.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(day)) {
      const entry = dayMap.get(day)!;
      if (log.success) entry.ok++; else entry.err++;
    }
  }

  const lastLog = recentLogs[0];

  return {
    phones: {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      active: byStatus["ACTIVE"] ?? 0,
      staged: byStatus["STAGED"] ?? 0,
      disabled: (byStatus["DISABLED"] ?? 0) + (byStatus["RETIRED"] ?? 0),
    },
    clients: clientCount,
    sites: siteCount,
    provisioning: {
      last24h: logs24h.length,
      errors24h: logs24h.filter(l => !l.success).length,
      lastActivity: lastLog?.createdAt ?? null,
    },
    recentErrors: recentErrors.map(e => ({
      macAddress: e.macAddress,
      label: e.phone?.label ?? null,
      message: e.message,
      createdAt: e.createdAt,
    })),
    recentLogs: recentLogs.map(l => ({
      id: l.id, success: l.success, vendor: l.vendor,
      macAddress: l.macAddress, message: l.message, createdAt: l.createdAt,
      phone: l.phone ?? null,
    })),
    recentPhones,
    activityByDay: Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })),
  };
}
