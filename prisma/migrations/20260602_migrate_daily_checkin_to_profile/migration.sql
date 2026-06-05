-- Drop existing constraint and index (IF EXISTS handles missing fkey in prod)
ALTER TABLE "DailyCheckIn" DROP CONSTRAINT IF EXISTS "DailyCheckIn_userId_fkey";
DROP INDEX IF EXISTS "DailyCheckIn_userId_checkInDate_key";
DROP INDEX IF EXISTS "DailyCheckIn_userId_createdAt_idx";

-- Backfill profiles for any users that don't have one
INSERT INTO "Profile" ("id", "userId", "timezone", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", 'Asia/Jerusalem', NOW(), NOW()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Profile" p WHERE p."userId" = u."id"
);

-- Add profileId column if it doesn't already exist (may exist from a previous failed attempt)
ALTER TABLE "DailyCheckIn" ADD COLUMN IF NOT EXISTS "profileId" TEXT;

-- Fill in any NULL profileId values using the userId column (which may still exist from partial migration)
UPDATE "DailyCheckIn" d
SET "profileId" = p."id"
FROM "Profile" p
WHERE p."userId" = d."userId"
  AND d."profileId" IS NULL;

-- Make profileId NOT NULL
ALTER TABLE "DailyCheckIn" ALTER COLUMN "profileId" SET NOT NULL;

-- Drop userId if it still exists
ALTER TABLE "DailyCheckIn" DROP COLUMN IF EXISTS "userId";

-- Add foreign key for profileId (skip if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DailyCheckIn_profileId_fkey'
  ) THEN
    ALTER TABLE "DailyCheckIn" ADD CONSTRAINT "DailyCheckIn_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create new indexes
CREATE UNIQUE INDEX IF NOT EXISTS "DailyCheckIn_profileId_checkInDate_key" ON "DailyCheckIn"("profileId", "checkInDate");
CREATE INDEX IF NOT EXISTS "DailyCheckIn_profileId_checkInDate_idx" ON "DailyCheckIn"("profileId", "checkInDate");
