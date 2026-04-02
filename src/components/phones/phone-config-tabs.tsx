"use client";

import { useState } from "react";

import { TabSip } from "./tabs/tab-sip";
import { TabSettings } from "./tabs/tab-settings";
import { TabMaintenance } from "./tabs/tab-maintenance";
import { TabPhoneSettings } from "./tabs/tab-phone-settings";
import { TabSipAccounts } from "./tabs/tab-sip-accounts";
import { TabTemplate } from "./tabs/tab-template";
import { TabNetwork } from "./tabs/tab-network";
import { TabSystem } from "./tabs/tab-system";
import { TabFirmware } from "./tabs/tab-firmware";
import { TabProvisioning } from "./tabs/tab-provisioning";
import { TabDiagnostics } from "./tabs/tab-diagnostics";
import { TabKeys } from "./tabs/tab-keys";

type ProgrammableKey = {
  id?: string;
  keyIndex: number;
  account: string | null;
  description: string | null;
  mode: string;
  locked: boolean;
  value: string | null;
};

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
  phoneModel: { id: string; vendor: string; modelCode: string; displayName: string; lineCapacity?: number | null };
  provisionLogs: { id: string; createdAt: Date; success: boolean; statusCode: number | null; message: string | null; requestPath: string }[];
  programmableKeys: ProgrammableKey[];
};

type Firmware = { id: string; version: string; status: string; isDefault: boolean };

type Props = {
  phone: Phone;
  firmwares: Firmware[];
  provisioningUrl: string;
};

const TABS = [
  { id: "sip",         label: "Compte SIP" },
  { id: "settings",     label: "Settings" },
  { id: "maintenance", label: "Maintenance" },
  { id: "phone",       label: "Phone Settings" },
  { id: "accounts",   label: "Comptes SIP" },
  { id: "template",   label: "Template" },
  { id: "network",    label: "Réseau" },
  { id: "system",     label: "Système" },
  { id: "firmware",   label: "Firmware" },
  { id: "keys",       label: "Touches program." },
  { id: "provisioning", label: "Provisioning" },
  { id: "diagnostics", label: "Diagnostics" },
];

export function PhoneConfigTabs({ phone, firmwares, provisioningUrl }: Props) {
  const [activeTab, setActiveTab] = useState("sip");

  return (
    <div>
      <div className="tabs" style={{ overflowX: "auto" }}>
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
      {activeTab === "settings" && <TabSettings phone={{ id: phone.id, phoneModel: { vendor: phone.phoneModel.vendor } }} />}
      {activeTab === "maintenance" && <TabMaintenance phone={{ id: phone.id, phoneModel: { vendor: phone.phoneModel.vendor } }} />}
      {activeTab === "phone" && <TabPhoneSettings phone={{ id: phone.id, phoneModel: { vendor: phone.phoneModel.vendor } }} />}
      {activeTab === "accounts" && <TabSipAccounts phone={{ id: phone.id, phoneModel: { vendor: phone.phoneModel.vendor } }} />}
      {activeTab === "template" && <TabTemplate phone={{ id: phone.id, phoneModel: { vendor: phone.phoneModel.vendor } }} />}
      {activeTab === "network" && <TabNetwork phone={{ id: phone.id, phoneModel: { vendor: phone.phoneModel.vendor } }} />}
      {activeTab === "system" && <TabSystem phone={{ id: phone.id, webPassword: phone.webPassword, adminPassword: phone.adminPassword, provisioningEnabled: phone.provisioningEnabled, phoneModel: { vendor: phone.phoneModel.vendor } }} />}
      {activeTab === "firmware" && <TabFirmware phone={phone} firmwares={firmwares} />}
      {activeTab === "keys" && (
        <TabKeys
          phone={{ id: phone.id, phoneModel: { vendor: phone.phoneModel.vendor, modelCode: phone.phoneModel.modelCode, lineCapacity: phone.phoneModel.lineCapacity } }}
          initialKeys={phone.programmableKeys.map(k => ({
            id: (k as { id?: string }).id,
            keyIndex: k.keyIndex,
            account: k.account ?? "Account1",
            description: k.description ?? "",
            mode: k.mode,
            locked: k.locked,
            value: k.value ?? "",
          }))}
        />
      )}
      {activeTab === "provisioning" && <TabProvisioning phone={phone} provisioningUrl={provisioningUrl} />}
      {activeTab === "diagnostics" && <TabDiagnostics phone={phone} />}
    </div>
  );
}
