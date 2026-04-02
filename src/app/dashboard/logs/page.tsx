import { Suspense } from "react";

import { ClientSelector } from "@/components/dashboard/client-selector";
import { LogsClient } from "@/components/logs/logs-client";
import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{ clientId?: string; status?: string }>;
};

export default async function LogsPage({ searchParams }: Props) {
  const { clientId, status } = await searchParams;

  const [clients, logs] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.provisionLog.findMany({
      where: {
        ...(clientId ? { phone: { clientId } } : {}),
        ...(status === "ok" ? { success: true } : status === "err" ? { success: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        phone: {
          select: {
            id: true,
            label: true,
            macAddress: true,
            client: { select: { name: true } },
            site: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          Logs de provisioning {selectedClient ? `— ${selectedClient.name}` : ""}
        </span>
        <Suspense fallback={null}>
          <ClientSelector clients={clients} selectedId={clientId} />
        </Suspense>
      </div>
      <div className="dashboard-content">
        <LogsClient logs={logs} clientId={clientId} />
      </div>
    </>
  );
}
