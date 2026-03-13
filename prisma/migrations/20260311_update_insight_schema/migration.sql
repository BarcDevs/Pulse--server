/*
  Warnings:

  - The values [DAILY_MOTIVATION,TREND_ANALYSIS,ACTIVITY_SUGGESTIONS] on the enum `InsightType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `title` to the `AIInsight` table without a default value. This will fail if there are existing rows, consider adding a default value.
  - Added the required column `userId` to the `AIInsight` table without a default value. This will fail if there are existing rows, consider adding a default value.

*/
-- AlterEnum
BEGIN;
  CREATE TYPE "InsightType_new" AS ENUM ('MOOD_DROP_ALERT', 'MOTIVATIONAL', 'WEEKLY_SUMMARY');
  ALTER TABLE "AIInsight" ALTER COLUMN "type" TYPE "InsightType_new" USING ("type"::text::"InsightType_new");
  DROP TYPE "InsightType";
  ALTER TYPE "InsightType_new" RENAME TO "InsightType";
COMMIT;

-- AlterTable
ALTER TABLE "AIInsight" ADD COLUMN "title" TEXT,
ADD COLUMN "userId" TEXT,
ADD COLUMN "metadata" JSONB,
DROP CONSTRAINT "AIInsight_checkInId_fkey",
ADD CONSTRAINT "AIInsight_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "DailyCheckIn" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill userId from DailyCheckIn
UPDATE "AIInsight" SET "userId" = (SELECT "userId" FROM "DailyCheckIn" WHERE "DailyCheckIn"."id" = "AIInsight"."checkInId");

-- AlterTable (make userId required)
ALTER TABLE "AIInsight" ALTER COLUMN "userId" SET NOT NULL;

-- Set default title for existing records if any
UPDATE "AIInsight" SET "title" = 'Insight' WHERE "title" IS NULL;

-- AlterTable (make title required)
ALTER TABLE "AIInsight" ALTER COLUMN "title" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AIInsight_userId_createdAt_idx" ON "AIInsight"("userId", "createdAt");
