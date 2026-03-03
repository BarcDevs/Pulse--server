-- Add timezone to User
ALTER TABLE "User" ADD COLUMN "timezone" TEXT;

-- Step 1: add checkInDate as nullable to allow backfill
ALTER TABLE "DailyCheckIn" ADD COLUMN "checkInDate" DATE;

-- Step 2: backfill from createdAt (truncate to date in UTC)
UPDATE "DailyCheckIn" SET "checkInDate" = "createdAt"::DATE;

-- Step 3: make non-nullable now that all rows have a value
ALTER TABLE "DailyCheckIn" ALTER COLUMN "checkInDate" SET NOT NULL;

-- Add updatedAt
ALTER TABLE "DailyCheckIn" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Step 4: drop duplicate rows so the unique constraint can be added
-- Keep the latest createdAt per (userId, checkInDate), delete the rest
DELETE FROM "DailyCheckIn" a
USING "DailyCheckIn" b
WHERE a."userId" = b."userId"
  AND a."checkInDate" = b."checkInDate"
  AND a."createdAt" < b."createdAt";

-- Step 5: add unique constraint
CREATE UNIQUE INDEX "DailyCheckIn_userId_checkInDate_key"
    ON "DailyCheckIn"("userId", "checkInDate");

-- Step 6: replace old index with new one on checkInDate
DROP INDEX IF EXISTS "DailyCheckIn_userId_createdAt_idx";
CREATE INDEX "DailyCheckIn_userId_checkInDate_idx"
    ON "DailyCheckIn"("userId", "checkInDate");