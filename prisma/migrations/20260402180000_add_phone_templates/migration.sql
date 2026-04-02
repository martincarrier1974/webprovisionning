CREATE TABLE "PhoneTemplate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vendor" "Vendor",
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PhoneTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhoneTemplateRule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhoneTemplateRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteTemplate" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SiteTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhoneTemplateAssign" (
    "id" TEXT NOT NULL,
    "phoneId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PhoneTemplateAssign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhoneTemplate_clientId_idx" ON "PhoneTemplate"("clientId");
CREATE UNIQUE INDEX "PhoneTemplateRule_templateId_key_key" ON "PhoneTemplateRule"("templateId", "key");
CREATE INDEX "PhoneTemplateRule_templateId_idx" ON "PhoneTemplateRule"("templateId");
CREATE UNIQUE INDEX "SiteTemplate_siteId_templateId_key" ON "SiteTemplate"("siteId", "templateId");
CREATE UNIQUE INDEX "PhoneTemplateAssign_phoneId_templateId_key" ON "PhoneTemplateAssign"("phoneId", "templateId");

ALTER TABLE "PhoneTemplate" ADD CONSTRAINT "PhoneTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhoneTemplateRule" ADD CONSTRAINT "PhoneTemplateRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PhoneTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteTemplate" ADD CONSTRAINT "SiteTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteTemplate" ADD CONSTRAINT "SiteTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PhoneTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhoneTemplateAssign" ADD CONSTRAINT "PhoneTemplateAssign_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhoneTemplateAssign" ADD CONSTRAINT "PhoneTemplateAssign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PhoneTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
