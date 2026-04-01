import { PrismaClient, UserRole, UserStatus, Vendor } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

const phoneModels = [
  { vendor: Vendor.YEALINK, modelCode: "T31P", displayName: "Yealink T31P", lineCapacity: 2 },
  { vendor: Vendor.YEALINK, modelCode: "T33G", displayName: "Yealink T33G", lineCapacity: 4 },
  { vendor: Vendor.YEALINK, modelCode: "T43U", displayName: "Yealink T43U", lineCapacity: 12 },
  { vendor: Vendor.YEALINK, modelCode: "T46U", displayName: "Yealink T46U", lineCapacity: 16 },
  { vendor: Vendor.YEALINK, modelCode: "T48U", displayName: "Yealink T48U", lineCapacity: 16 },
  { vendor: Vendor.YEALINK, modelCode: "T53W", displayName: "Yealink T53W", lineCapacity: 12 },
  { vendor: Vendor.YEALINK, modelCode: "T54W", displayName: "Yealink T54W", lineCapacity: 16 },
  { vendor: Vendor.YEALINK, modelCode: "T57W", displayName: "Yealink T57W", lineCapacity: 16 },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP1625", displayName: "Grandstream GXP1625", lineCapacity: 2 },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP1630", displayName: "Grandstream GXP1630", lineCapacity: 3 },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2130", displayName: "Grandstream GXP2130", lineCapacity: 3 },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2135", displayName: "Grandstream GXP2135", lineCapacity: 8 },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2140", displayName: "Grandstream GXP2140", lineCapacity: 4 },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2160", displayName: "Grandstream GXP2160", lineCapacity: 6 },
  { vendor: Vendor.GRANDSTREAM, modelCode: "GXP2170", displayName: "Grandstream GXP2170", lineCapacity: 12 },
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
