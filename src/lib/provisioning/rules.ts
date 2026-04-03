import { ProvisioningSource, type ProvisioningRule, type Vendor } from "@prisma/client";

import { db } from "@/lib/db";
import { phoneMacMatchWhere } from "@/lib/mac-address";

const sourcePriority: Record<ProvisioningSource | "TEMPLATE", number> = {
  DEFAULT: 0,
  CLIENT: 1,
  SITE: 2,
  TEMPLATE: 3,
  MODEL: 4,
  PHONE: 5,
};

export type PhoneProvisioningContext = {
  id: string;
  macAddress: string;
  clientId: string;
  siteId: string | null;
  phoneModelId: string;
  label: string | null;
  extensionNumber: string | null;
  sipUsername: string | null;
  sipPassword: string | null;
  sipServer: string | null;
  webPassword: string | null;
  adminPassword: string | null;
  status: string;
  client: {
    id: string;
    name: string;
    defaultLanguage: string;
    timezone: string;
  };
  site: {
    id: string;
    name: string;
    timezone: string | null;
  } | null;
  phoneModel: {
    id: string;
    vendor: Vendor;
    modelCode: string;
    displayName: string;
    lineCapacity: number | null;
  };
  firmwareTarget: {
    id: string;
    version: string;
    storageKey: string;
    originalName: string;
  } | null;
  programmableKeys: {
    keyIndex: number;
    account: string | null;
    description: string | null;
    mode: string;
    locked: boolean;
    value: string | null;
  }[];
  sipAccounts: {
    accountIndex: number;
    label: string | null;
    sipUsername: string | null;
    sipPassword: string | null;
    sipServer: string | null;
    displayName: string | null;
    enabled: boolean;
  }[];
};

export async function getProvisioningContextByMac(macAddress: string) {
  return db.phone.findFirst({
    where: phoneMacMatchWhere(macAddress),
    include: {
      client: {
        select: {
          id: true,
          name: true,
          defaultLanguage: true,
          timezone: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          timezone: true,
        },
      },
      phoneModel: {
        select: {
          id: true,
          vendor: true,
          modelCode: true,
          displayName: true,
          lineCapacity: true,
        },
      },
      firmwareTarget: {
        select: {
          id: true,
          version: true,
          storageKey: true,
          originalName: true,
        },
      },
      programmableKeys: {
        orderBy: { keyIndex: "asc" as const },
        select: {
          keyIndex: true,
          account: true,
          description: true,
          mode: true,
          locked: true,
          value: true,
        },
      },
      sipAccounts: {
        where: { enabled: true },
        orderBy: { accountIndex: "asc" as const },
        select: {
          accountIndex: true,
          label: true,
          sipUsername: true,
          sipPassword: true,
          sipServer: true,
          displayName: true,
          enabled: true,
        },
      },
    },
  });
}

export async function getResolvedProvisioningRules(context: PhoneProvisioningContext) {
  // 1. Règles hiérarchiques standard (DEFAULT → CLIENT → SITE → MODEL → PHONE)
  const rules = await db.provisioningRule.findMany({
    where: {
      OR: [
        { source: ProvisioningSource.DEFAULT, clientId: null, siteId: null, phoneModelId: null, phoneId: null },
        { source: ProvisioningSource.CLIENT, clientId: context.clientId },
        ...(context.siteId ? [{ source: ProvisioningSource.SITE, siteId: context.siteId }] : []),
        { source: ProvisioningSource.MODEL, phoneModelId: context.phoneModelId },
        { source: ProvisioningSource.PHONE, phoneId: context.id },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // 2. Règles de templates — phone-level (priorité TEMPLATE = entre SITE et MODEL)
  const phoneTemplates = await db.phoneTemplateAssign.findMany({
    where: { phoneId: context.id },
    include: { template: { include: { rules: { orderBy: { sortOrder: "asc" } } } } },
    orderBy: { sortOrder: "asc" },
  });

  // 3. Règles de templates — site-level
  const siteTemplates = context.siteId
    ? await db.siteTemplate.findMany({
        where: { siteId: context.siteId },
        include: { template: { include: { rules: { orderBy: { sortOrder: "asc" } } } } },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  // Normaliser les règles templates en entrées comparables
  type NormalizedRule = {
    key: string;
    value: string;
    source: ProvisioningSource | "TEMPLATE";
    sortOrder: number;
    createdAt: Date;
  };

  const templateEntries: NormalizedRule[] = [
    ...siteTemplates.flatMap(st =>
      st.template.rules.map(r => ({
        key: r.key,
        value: r.value,
        source: "TEMPLATE" as const,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
      }))
    ),
    ...phoneTemplates.flatMap(pt =>
      pt.template.rules.map(r => ({
        key: r.key,
        value: r.value,
        source: "TEMPLATE" as const,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
      }))
    ),
  ];

  const normalizedRules: NormalizedRule[] = rules.map(r => ({
    key: r.key,
    value: r.value,
    source: r.source,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  }));

  // 4. Trier et résoudre (last-write-wins par priorité croissante)
  const allRules = [...normalizedRules, ...templateEntries].sort((a, b) => {
    const sourceDiff = sourcePriority[a.source] - sourcePriority[b.source];
    if (sourceDiff !== 0) return sourceDiff;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const resolvedMap = new Map<string, NormalizedRule>();
  for (const rule of allRules) {
    resolvedMap.set(rule.key, rule);
  }

  return {
    rules: allRules,
    resolvedMap,
    resolvedEntries: Array.from(resolvedMap.entries()).map(([key, rule]) => ({
      key,
      value: rule.value,
      source: rule.source,
      sortOrder: rule.sortOrder,
    })),
  };
}

export type ResolvedRuleEntry = Awaited<ReturnType<typeof getResolvedProvisioningRules>>["resolvedEntries"][number];
