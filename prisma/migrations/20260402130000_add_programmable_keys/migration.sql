CREATE TABLE "PhoneProgrammableKey" (
    "id" TEXT NOT NULL,
    "phoneId" TEXT NOT NULL,
    "keyIndex" INTEGER NOT NULL,
    "account" TEXT,
    "description" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'DEFAULT',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneProgrammableKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhoneProgrammableKey_phoneId_keyIndex_key" ON "PhoneProgrammableKey"("phoneId", "keyIndex");
CREATE INDEX "PhoneProgrammableKey_phoneId_idx" ON "PhoneProgrammableKey"("phoneId");

ALTER TABLE "PhoneProgrammableKey" ADD CONSTRAINT "PhoneProgrammableKey_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
