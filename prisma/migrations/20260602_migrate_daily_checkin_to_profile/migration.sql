-- Drop existing constraint and index
ALTER TABLE "DailyCheckIn" DROP CONSTRAINT IF EXISTS "DailyCheckIn_userId_fkey";
DROP INDEX IF EXISTS "DailyCheckIn_userId_checkInDate_key";
DROP INDEX IF EXISTS "DailyCheckIn_userId_createdAt_idx";

-- Backfill profiles for any users that don't have one (prod may have users without profiles)
INSERT INTO "Profile" ("id", "userId", "timezone", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", 'Asia/Jerusalem', NOW(), NOW()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Profile" p WHERE p."userId" = u."id"
);

-- Add profileId column
ALTER TABLE "DailyCheckIn" ADD COLUMN "profileId" TEXT;

-- Copy data from User.id to Profile.id via User relation
UPDATE "DailyCheckIn"
SET "profileId" = p."id"
FROM "Profile" p
WHERE p."userId" = "DailyCheckIn"."userId";

-- Make profileId NOT NULL
ALTER TABLE "DailyCheckIn" ALTER COLUMN "profileId" SET NOT NULL;

-- Drop userId
ALTER TABLE "DailyCheckIn" DROP COLUMN "userId";

-- Add foreign key for profileId
ALTER TABLE "DailyCheckIn" ADD CONSTRAINT "DailyCheckIn_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create new indexes
CREATE UNIQUE INDEX "DailyCheckIn_profileId_checkInDate_key" ON "DailyCheckIn"("profileId", "checkInDate");
CREATE INDEX "DailyCheckIn_profileId_checkInDate_idx" ON "DailyCheckIn"("profileId", "checkInDate");
