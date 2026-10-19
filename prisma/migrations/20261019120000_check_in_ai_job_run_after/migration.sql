-- AlterTable
ALTER TABLE "CheckInAiJob" ADD COLUMN     "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropIndex
DROP INDEX "CheckInAiJob_status_createdAt_idx";

-- CreateIndex
CREATE INDEX "CheckInAiJob_status_runAfter_createdAt_idx" ON "CheckInAiJob"("status", "runAfter", "createdAt");
