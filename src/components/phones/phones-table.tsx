import Link from "next/link";

import { translateStatus } from "@/lib/i18n/status";

type Phone = {
  id: string;
  macAddress: string;
  label: string | null;
  extensionNumber: string | null;
  sipUsername: string | null;
  sipServer: string | null;
  status: string;
  lastProvisionedAt: Date | null;
  provisioningEnabled: boolean;
  client: { id: string; name: string };
  site: { id: string; name: string } | null;
  phoneModel: { id: string; vendor: string; modelCode: string; displayName: string };
  firmwareTarget: { id: string; version: string } | null;
};

type Props = {
  phones: Phone[];
};

export function PhonesTable({ phones }: Props) {
  if (phones.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun téléphone trouvé.</p>
        <a href="/dashboard/phones/new" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
          + Ajouter un téléphone
        </a>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#111", borderBottom: "1px solid var(--card-border)" }}>
              <Th>Adresse MAC</Th>
              <Th>Nom / Poste</Th>
              <Th>Modèle</Th>
              <Th>Serveur SIP</Th>
              <Th>Firmware cible</Th>
              <Th>Site</Th>
              <Th>Client</Th>
              <Th>Dernier provisionning</Th>
              <Th>Statut</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {phones.map((phone, i) => (
              <tr
                key={phone.id}
                style={{
                  borderBottom: "1px solid #1a1a1a",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  transition: "background 0.1s",
                }}
              >
                <Td>
                  <span style={{ fontFamily: "monospace", color: "#f97316", fontSize: 12 }}>
                    {phone.macAddress}
                  </span>
                </Td>
                <Td>
                  <div style={{ fontWeight: 600 }}>{phone.label || "—"}</div>
                  {phone.extensionNumber && (
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>#{phone.extensionNumber}</div>
                  )}
                </Td>
                <Td>
                  <div>{phone.phoneModel.displayName}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11 }}>{phone.phoneModel.vendor}</div>
                </Td>
                <Td>
                  <div style={{ color: "var(--muted)" }}>{phone.sipServer || "—"}</div>
                  {phone.sipUsername && (
                    <div style={{ fontSize: 11, color: "#666" }}>{phone.sipUsername}</div>
                  )}
                </Td>
                <Td>
                  {phone.firmwareTarget ? (
                    <span style={{ color: "#4ade80", fontSize: 12 }}>v{phone.firmwareTarget.version}</span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  )}
                </Td>
                <Td>{phone.site?.name || <span style={{ color: "var(--muted)" }}>—</span>}</Td>
                <Td style={{ color: "var(--muted)" }}>{phone.client.name}</Td>
                <Td>
                  {phone.lastProvisionedAt ? (
                    <div>
                      <div style={{ fontSize: 12 }}>
                        {new Date(phone.lastProvisionedAt).toLocaleDateString("fr-CA")}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 11 }}>
                        {new Date(phone.lastProvisionedAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>Jamais</span>
                  )}
                </Td>
                <Td>
                  <StatusBadge status={phone.status} />
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link
                      href={`/dashboard/phones/${phone.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      Configurer
                    </Link>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--card-border)", color: "var(--muted)", fontSize: 12 }}>
        {phones.length} appareil(s)
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "10px 14px", verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    STAGED: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
    DISABLED: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    RETIRED: { bg: "rgba(100,116,139,0.12)", color: "#64748b" },
  };
  const style = colorMap[status] ?? { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" };
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: style.bg, color: style.color, fontWeight: 600, whiteSpace: "nowrap" }}>
      {translateStatus(status)}
    </span>
  );
}
