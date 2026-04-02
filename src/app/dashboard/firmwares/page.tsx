import { CreateFirmwareForm } from "@/components/admin/create-firmware-form";
import { FirmwareManagementActions } from "@/components/admin/firmware-management-actions";
import { db } from "@/lib/db";

export default async function FirmwaresPage() {
  const [phoneModels, firmwares] = await Promise.all([
    db.phoneModel.findMany({
      where: { isActive: true },
      orderBy: [{ vendor: "asc" }, { displayName: "asc" }],
      select: { id: true, vendor: true, modelCode: true, displayName: true },
    }),
    db.firmware.findMany({
      orderBy: [{ phoneModel: { vendor: "asc" } }, { phoneModel: { displayName: "asc" } }, { version: "desc" }],
      include: {
        phoneModel: { select: { id: true, vendor: true, modelCode: true, displayName: true } },
        _count: { select: { phones: true } },
      },
    }),
  ]);

  const phoneModelOptions = phoneModels.map(({ id, displayName, vendor }) => ({ id, displayName, vendor }));

  return (
    <>
      <div className="dashboard-topbar">
        <span className="dashboard-topbar-title">Firmwares</span>
      </div>
      <div className="dashboard-content">
        <div className="grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="card-title">Nouveau</div>
            <div className="card-heading">Ajouter un firmware</div>
            <p className="card-desc">Déclare une version de firmware pour un modèle de téléphone.</p>
            <CreateFirmwareForm phoneModels={phoneModelOptions} />
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <div className="card-title">Firmwares</div>
                <div className="section-title">{firmwares.length} firmware(s)</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {firmwares.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>Aucun firmware.</p>
              ) : firmwares.map((fw) => (
                <div key={fw.id} className="item-row" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div className="item-row-info">
                    <div className="item-row-title">{fw.phoneModel.vendor} · {fw.phoneModel.displayName} — v{fw.version}</div>
                    <div className="item-row-sub">
                      {fw.originalName}
                      {` · ${fw.status}`}
                      {fw.isDefault ? " · ★ défaut" : ""}
                      {` · ${fw._count.phones} téléphone(s)`}
                    </div>
                  </div>
                  <FirmwareManagementActions
                    firmware={{
                      id: fw.id,
                      phoneModelId: fw.phoneModel.id,
                      version: fw.version,
                      storageKey: fw.storageKey,
                      originalName: fw.originalName,
                      checksumSha256: fw.checksumSha256,
                      releaseNotes: fw.releaseNotes,
                      status: fw.status,
                      isDefault: fw.isDefault,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
