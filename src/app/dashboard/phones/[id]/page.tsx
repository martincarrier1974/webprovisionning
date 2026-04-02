import { notFound } from "next/navigation";

import { PhoneConfigTabs } from "@/components/phones/phone-config-tabs";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PhoneConfigPage({ params }: Props) {
  const { id } = await params;

  const phone = await db.phone.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, timezone: true, defaultLanguage: true } },
      site: { select: { id: true, name: true, timezone: true } },
      phoneModel: { select: { id: true, vendor: true, modelCode: true, displayName: true, lineCapacity: true } },
      firmwareTarget: { select: { id: true, version: true, storageKey: true } },
      programmableKeys: {
        orderBy: { keyIndex: "asc" },
        select: { id: true, keyIndex: true, account: true, description: true, mode: true, locked: true, value: true },
      },
      provisionLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, createdAt: true, success: true, statusCode: true, message: true, requestPath: true },
      },
    },
  });

  if (!phone) notFound();

  const firmwares = await db.firmware.findMany({
    where: { phoneModelId: phone.phoneModel.id },
    orderBy: { version: "desc" },
    select: { id: true, version: true, status: true, isDefault: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const vendor = phone.phoneModel.vendor.toLowerCase();
  const provisioningUrl = `${baseUrl}/api/provisioning/${vendor}/${phone.macAddress}`;

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">
          <a href="/dashboard/phones" style={{ color: "var(--muted)", marginRight: 8 }}>Téléphones</a>
          / <span style={{ color: "var(--accent)" }}>{phone.label || phone.macAddress}</span>
        </span>
        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "monospace" }}>{phone.macAddress}</span>
      </div>

      <div className="dashboard-content">
        {/* Header card */}
        <div className="card" style={{ marginBottom: 20, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div className="card-title">{phone.phoneModel.vendor} · {phone.phoneModel.displayName}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{phone.label || "Sans nom"}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {phone.client.name}{phone.site ? ` · ${phone.site.name}` : ""} · {phone.extensionNumber ? `Poste #${phone.extensionNumber}` : "Aucun poste"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatusPill status={phone.status} />
            {phone.lastProvisionedAt && (
              <span style={{ fontSize: 12, color: "var(--muted)", padding: "4px 10px", background: "#1a1a1a", borderRadius: 99 }}>
                Prov. {new Date(phone.lastProvisionedAt).toLocaleDateString("fr-CA")}
              </span>
            )}
          </div>
        </div>

        <PhoneConfigTabs phone={phone} firmwares={firmwares} provisioningUrl={provisioningUrl} />
      </div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: "rgba(74,222,128,0.12)", color: "#4ade80", label: "Actif" },
    STAGED: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", label: "En attente" },
    DISABLED: { bg: "rgba(248,113,113,0.12)", color: "#f87171", label: "Désactivé" },
    RETIRED: { bg: "rgba(100,116,139,0.12)", color: "#64748b", label: "Retiré" },
  };
  const s = map[status] ?? { bg: "#1a1a1a", color: "#888", label: status };
  return (
    <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: s.bg, color: s.color, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}
