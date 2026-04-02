CREATE TABLE "PhoneSipAccount" (
    "id"             TEXT NOT NULL,
    "phoneId"        TEXT NOT NULL,
    "accountIndex"   INTEGER NOT NULL DEFAULT 2,
    "label"          TEXT,
    "sipUsername"    TEXT,
    "sipPassword"    TEXT,
    "sipServer"      TEXT,
    "displayName"    TEXT,
    "enabled"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PhoneSipAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhoneSipAccount_phoneId_accountIndex_key" ON "PhoneSipAccount"("phoneId", "accountIndex");
CREATE INDEX "PhoneSipAccount_phoneId_idx" ON "PhoneSipAccount"("phoneId");

ALTER TABLE "PhoneSipAccount" ADD CONSTRAINT "PhoneSipAccount_phoneId_fkey"
  FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
