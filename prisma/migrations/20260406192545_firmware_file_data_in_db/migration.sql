-- AlterTable
ALTER TABLE "Firmware" ADD COLUMN     "fileData" BYTEA;

-- CreateIndex
CREATE INDEX "Firmware_storageKey_idx" ON "Firmware"("storageKey");
