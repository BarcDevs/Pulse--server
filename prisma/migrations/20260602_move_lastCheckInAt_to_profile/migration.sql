-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "lastCheckInAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastCheckInAt";
