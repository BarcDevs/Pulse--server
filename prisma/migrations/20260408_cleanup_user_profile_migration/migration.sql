-- Remove lastCheckInAt from User (already on Profile)
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastCheckInAt";

-- Remove the DailyCheckIn.userId unique constraint (if User.checkIns is no longer needed)
-- Keep the profileId as the primary relation
ALTER TABLE "DailyCheckIn" DROP CONSTRAINT IF EXISTS "DailyCheckIn_userId_checkInDate_key";
DROP INDEX IF EXISTS "DailyCheckIn_userId_checkInDate_idx";

-- Remove userId foreign key from DailyCheckIn if it exists
ALTER TABLE "DailyCheckIn" DROP CONSTRAINT IF EXISTS "DailyCheckIn_userId_fkey";

-- If userId column still exists on DailyCheckIn, drop it
ALTER TABLE "DailyCheckIn" DROP COLUMN IF EXISTS "userId";

-- Ensure profileId unique constraint and index exist
ALTER TABLE "DailyCheckIn" 
  ADD CONSTRAINT "DailyCheckIn_profileId_checkInDate_key" UNIQUE("profileId", "checkInDate");

CREATE INDEX "DailyCheckIn_profileId_checkInDate_idx" 
  ON "DailyCheckIn"("profileId", "checkInDate");

-- Remove _TagToUser junction table if it exists (User.followedTags moved to Profile)
DROP TABLE IF EXISTS "_TagToUser";
