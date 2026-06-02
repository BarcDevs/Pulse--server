-- AlterTable
ALTER TABLE "User" ADD COLUMN "pendingEmail" TEXT,
ADD COLUMN "emailChangeOTP" INTEGER,
ADD COLUMN "emailChangeExpiration" TIMESTAMP(3);
