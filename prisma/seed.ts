import { PrismaClient, UserRole, UserStatus, Vendor } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

const phoneModels = [
  // ── Yealink T-series ──────────────────────────────────────────────────────
  // lineCapacity = nombre de linekeys programmables physiques
  { vendor: Vendor.YEALINK, modelCode: "T31",  displayName: "Yealink T31",  lineCapacity: 0  },
  { vendor: Vendor.YEALINK, modelCode: "T31P", displayName: "Yealink T31P", lineCapacity: 0  },
  { vendor: Vendor.YEALINK, modelCode: "T33G", displayName: "Yealink T33G", lineCapacity: 4  },
  { vendor: Vendor.YEALINK, modelCode: "T43U", displayName: "Yealink T43U", lineCapacity: 8  },
  { vendor: Vendor.YEALINK, modelCode: "T46U", displayName: "Yealink T46U", lineCapacity: 16 },
  { vendor: Vendor.YEALINK, modelCode: "T48U", displayName: "Yealink T48U", lineCapacity: 29 },
  { vendor: Vendor.YEALINK, modelCode: "T53",  displayName: "Yealink T53",  lineCapacity: 12 },
  { vendor: Vendor.YEALINK, modelCode: "T53W", displayName: "Yealink T53W", lineCapacity: 12 },
  { vendor: Vendor.YEALINK, modelCode: "T54W", displayName: "Yealink T54W", lineCapacity: 27 },
  { vendor: Vendor.YEALINK, modelCode: "T57W", displayName: "Yealink T57W", lineCapacity: 29 },
  { vendor: Vendor.YEALINK, modelCode: "T58A", displayName: "Yealink T58A", lineCapacity: 27 },

  // ── Grandstream GXP-series ────────────────────────────────────────────────
  // lineCapacity = MPK physiques (VMPK s'ajoute par software)
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP1610", displayName: "Grandstream GXP1610", lineCapacity: 0  },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP1615", displayName: "Grandstream GXP1615", lineCapacity: 0  },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP1620", displayName: "Grandstream GXP1620", lineCapacity: 0  },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP1625", displayName: "Grandstream GXP1625", lineCapacity: 0  },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP1628", displayName: "Grandstream GXP1628", lineCapacity: 0  },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP1630", displayName: "Grandstream GXP1630", lineCapacity: 3  },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2130", displayName: "Grandstream GXP2130", lineCapacity: 8  },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2135", displayName: "Grandstream GXP2135", lineCapacity: 8  }, // + 16 VMPK
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2140", displayName: "Grandstream GXP2140", lineCapacity: 4  },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2160", displayName: "Grandstream GXP2160", lineCapacity: 24 },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2170", displayName: "Grandstream GXP2170", lineCapacity: 48 },

  // ── Snom M-series (DECT) ──────────────────────────────────────────────────
  // lineCapacity = touches programmables (0 pour DECT de base)
  { vendor: Vendor.SNOM, modelCode: "M10",   displayName: "Snom M10",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M25",   displayName: "Snom M25",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M30",   displayName: "Snom M30",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M55",   displayName: "Snom M55",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M65",   displayName: "Snom M65",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M70",   displayName: "Snom M70",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M80",   displayName: "Snom M80",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M85",   displayName: "Snom M85",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M90",   displayName: "Snom M90",   lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M300",  displayName: "Snom M300",  lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M700",  displayName: "Snom M700",  lineCapacity: 0 },
  { vendor: Vendor.SNOM, modelCode: "M900",  displayName: "Snom M900",  lineCapacity: 0 },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  for (const model of phoneModels) {
    await prisma.phoneModel.upsert({
      where: {
        vendor_modelCode: {
          vendor: model.vendor,
          modelCode: model.modelCode,
        },
      },
      update: {
        displayName: model.displayName,
        lineCapacity: model.lineCapacity,
        isActive: true,
      },
      create: model,
    });
  }

  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: UserRole.SUPER_ADMIN,
        status: adminPassword ? UserStatus.ACTIVE : UserStatus.INVITED,
        locale: "fr",
        passwordHash: adminPassword ? await hashPassword(adminPassword) : undefined,
      },
      create: {
        email: adminEmail,
        role: UserRole.SUPER_ADMIN,
        status: adminPassword ? UserStatus.ACTIVE : UserStatus.INVITED,
        locale: "fr",
        passwordHash: adminPassword ? await hashPassword(adminPassword) : null,
      },
    });
  }

  console.log(`Seed complete: ${phoneModels.length} phone models synced.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
