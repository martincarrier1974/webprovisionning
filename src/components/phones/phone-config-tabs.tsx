"use client";

import { useState } from "react";

import { TabSip } from "./tabs/tab-sip";
import { TabSystem } from "./tabs/tab-system";
import { TabFirmware } from "./tabs/tab-firmware";
import { TabProvisioning } from "./tabs/tab-provisioning";
import { TabDiagnostics } from "./tabs/tab-diagnostics";

type Phone = {
  id: string;
  macAddress: string;
  label: string | null;
  extensionNumber: string | null;
  sipUsername: string | null;
  sipPassword: string | null;
  sipServer: string | null;
  webPassword: string | null;
  adminPassword: string | null;
  status: string;
  provisioningEnabled: boolean;
  lastProvisionedAt: Date | null;
  firmwareTarget: { id: string; version: string; storageKey: string | null } | null;
  client: { id: string; name: string; timezone: string | null; defaultLanguage: string };
  site: { id: string; name: string; timezone: string | null } | null;
  phoneModel: { id: string; vendor: string; modelCode: string; displayName: string };
  provisionLogs: { id: string; createdAt: Date; success: boolean; statusCode: number | null; message: string | null; requestPath: string }[];
};

type Firmware = { id: string; version: string; status: string; isDefault: boolean };

type Props = {
  phone: Phone;
  firmwares: Firmware[];
  provisioningUrl: string;
};

const TABS = [
  { id: "sip", label: "Compte SIP" },
  { id: "system", label: "Système" },
  { id: "firmware", label: "Firmware" },
  { id: "provisioning", label: "Provisioning" },
  { id: "diagnostics", label: "Diagnostics" },
];

export function PhoneConfigTabs({ phone, firmwares, provisioningUrl }: Props) {
  const [activeTab, setActiveTab] = useState("sip");

  return (
    <div>
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sip" && <TabSip phone={phone} />}
      {activeTab === "system" && <TabSystem phone={phone} />}
      {activeTab === "firmware" && <TabFirmware phone={phone} firmwares={firmwares} />}
      {activeTab === "provisioning" && <TabProvisioning phone={phone} provisioningUrl={provisioningUrl} />}
      {activeTab === "diagnostics" && <TabDiagnostics phone={phone} />}
    </div>
  );
}
