-- DropForeignKey
ALTER TABLE "AIInsight" DROP CONSTRAINT "AIInsight_checkInId_fkey";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "anonymousParticipation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "communityAlerts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyReminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dateFormat" TEXT DEFAULT 'dd/mm/yyyy',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en-US',
ADD COLUMN     "profileVisibility" TEXT NOT NULL DEFAULT 'friends',
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light';

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "DailyCheckIn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
