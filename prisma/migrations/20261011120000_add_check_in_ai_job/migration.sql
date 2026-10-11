-- CreateEnum
CREATE TYPE "CheckInAiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "CheckInAiJob" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CheckInAiJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInAiJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckInAiJob_checkInId_key" ON "CheckInAiJob"("checkInId");

-- CreateIndex
CREATE INDEX "CheckInAiJob_status_createdAt_idx" ON "CheckInAiJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CheckInAiJob" ADD CONSTRAINT "CheckInAiJob_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "DailyCheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
