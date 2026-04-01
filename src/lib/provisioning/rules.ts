import { ProvisioningSource, type ProvisioningRule, type Vendor } from "@prisma/client";

import { db } from "@/lib/db";

const sourcePriority: Record<ProvisioningSource, number> = {
  DEFAULT: 0,
  CLIENT: 1,
  SITE: 2,
  MODEL: 3,
  PHONE: 4,
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
  };
  firmwareTarget: {
    id: string;
    version: string;
    storageKey: string;
    originalName: string;
  } | null;
};

export async function getProvisioningContextByMac(macAddress: string) {
  return db.phone.findUnique({
    where: { macAddress },
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
    },
  });
}

export async function getResolvedProvisioningRules(context: PhoneProvisioningContext) {
  const rules = await db.provisioningRule.findMany({
    where: {
      OR: [
        {
          source: ProvisioningSource.DEFAULT,
          clientId: null,
          siteId: null,
          phoneModelId: null,
          phoneId: null,
        },
        {
          source: ProvisioningSource.CLIENT,
          clientId: context.clientId,
        },
        ...(context.siteId
          ? [
              {
                source: ProvisioningSource.SITE,
                siteId: context.siteId,
              },
            ]
          : []),
        {
          source: ProvisioningSource.MODEL,
          phoneModelId: context.phoneModelId,
        },
        {
          source: ProvisioningSource.PHONE,
          phoneId: context.id,
        },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const orderedRules = [...rules].sort((a, b) => {
    const sourceDiff = sourcePriority[a.source] - sourcePriority[b.source];
    if (sourceDiff !== 0) return sourceDiff;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const resolvedMap = new Map<string, ProvisioningRule>();

  for (const rule of orderedRules) {
    resolvedMap.set(rule.key, rule);
  }

  return {
    rules: orderedRules,
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
