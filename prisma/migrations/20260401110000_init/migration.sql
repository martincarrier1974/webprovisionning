-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "Vendor" AS ENUM ('YEALINK', 'GRANDSTREAM');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PhoneStatus" AS ENUM ('STAGED', 'ACTIVE', 'DISABLED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProvisioningSource" AS ENUM ('DEFAULT', 'CLIENT', 'SITE', 'MODEL', 'PHONE');

-- CreateEnum
CREATE TYPE "FirmwareStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "passwordHash" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "clientId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'fr',
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT DEFAULT 'CA',
    "timezone" TEXT,
    "status" "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneModel" (
    "id" TEXT NOT NULL,
    "vendor" "Vendor" NOT NULL,
    "modelCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "lineCapacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phone" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT,
    "phoneModelId" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "label" TEXT,
    "extensionNumber" TEXT,
    "sipUsername" TEXT,
    "sipPassword" TEXT,
    "sipServer" TEXT,
    "provisioningEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webPassword" TEXT,
    "adminPassword" TEXT,
    "firmwareTargetId" TEXT,
    "status" "PhoneStatus" NOT NULL DEFAULT 'STAGED',
    "lastProvisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvisioningRule" (
    "id" TEXT NOT NULL,
    "source" "ProvisioningSource" NOT NULL,
    "clientId" TEXT,
    "siteId" TEXT,
    "phoneModelId" TEXT,
    "phoneId" TEXT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProvisioningRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Firmware" (
    "id" TEXT NOT NULL,
    "phoneModelId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSizeBytes" BIGINT,
    "checksumSha256" TEXT,
    "releaseNotes" TEXT,
    "status" "FirmwareStatus" NOT NULL DEFAULT 'DRAFT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firmware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvisionLog" (
    "id" TEXT NOT NULL,
    "phoneId" TEXT,
    "vendor" "Vendor" NOT NULL,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestPath" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "statusCode" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProvisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "siteId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- CreateIndex
CREATE INDEX "Client_slug_idx" ON "Client"("slug");

-- CreateIndex
CREATE INDEX "Site_clientId_status_idx" ON "Site"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Site_clientId_slug_key" ON "Site"("clientId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneModel_vendor_modelCode_key" ON "PhoneModel"("vendor", "modelCode");

-- CreateIndex
CREATE UNIQUE INDEX "Phone_macAddress_key" ON "Phone"("macAddress");

-- CreateIndex
CREATE INDEX "Phone_clientId_status_idx" ON "Phone"("clientId", "status");

-- CreateIndex
CREATE INDEX "Phone_siteId_idx" ON "Phone"("siteId");

-- CreateIndex
CREATE INDEX "Phone_phoneModelId_idx" ON "Phone"("phoneModelId");

-- CreateIndex
CREATE INDEX "ProvisioningRule_source_clientId_idx" ON "ProvisioningRule"("source", "clientId");

-- CreateIndex
CREATE INDEX "ProvisioningRule_source_siteId_idx" ON "ProvisioningRule"("source", "siteId");

-- CreateIndex
CREATE INDEX "ProvisioningRule_source_phoneModelId_idx" ON "ProvisioningRule"("source", "phoneModelId");

-- CreateIndex
CREATE INDEX "ProvisioningRule_source_phoneId_idx" ON "ProvisioningRule"("source", "phoneId");

-- CreateIndex
CREATE INDEX "Firmware_phoneModelId_status_idx" ON "Firmware"("phoneModelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Firmware_phoneModelId_version_key" ON "Firmware"("phoneModelId", "version");

-- CreateIndex
CREATE INDEX "ProvisionLog_macAddress_createdAt_idx" ON "ProvisionLog"("macAddress", "createdAt");

-- CreateIndex
CREATE INDEX "ProvisionLog_vendor_createdAt_idx" ON "ProvisionLog"("vendor", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_clientId_createdAt_idx" ON "AuditLog"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_siteId_createdAt_idx" ON "AuditLog"("siteId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phone" ADD CONSTRAINT "Phone_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phone" ADD CONSTRAINT "Phone_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phone" ADD CONSTRAINT "Phone_phoneModelId_fkey" FOREIGN KEY ("phoneModelId") REFERENCES "PhoneModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phone" ADD CONSTRAINT "Phone_firmwareTargetId_fkey" FOREIGN KEY ("firmwareTargetId") REFERENCES "Firmware"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisioningRule" ADD CONSTRAINT "ProvisioningRule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisioningRule" ADD CONSTRAINT "ProvisioningRule_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisioningRule" ADD CONSTRAINT "ProvisioningRule_phoneModelId_fkey" FOREIGN KEY ("phoneModelId") REFERENCES "PhoneModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisioningRule" ADD CONSTRAINT "ProvisioningRule_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Firmware" ADD CONSTRAINT "Firmware_phoneModelId_fkey" FOREIGN KEY ("phoneModelId") REFERENCES "PhoneModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisionLog" ADD CONSTRAINT "ProvisionLog_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

