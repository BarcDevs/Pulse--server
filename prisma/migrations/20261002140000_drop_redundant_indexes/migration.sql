-- Each index below is a leading-column duplicate of a unique constraint or
-- primary key on the same table, so it only adds write cost.

-- DropIndex
DROP INDEX "DailyCheckIn_profileId_checkInDate_idx";

-- DropIndex
DROP INDEX "Milestone_goalId_idx";

-- DropIndex
DROP INDEX "Profile_userId_idx";

-- DropIndex
DROP INDEX "ProfileToTag_profileId_idx";

-- DropIndex
DROP INDEX "SavedPost_profileId_idx";
