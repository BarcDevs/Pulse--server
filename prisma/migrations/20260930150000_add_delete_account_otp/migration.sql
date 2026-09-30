-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deleteAccountAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deleteAccountExpiration" TIMESTAMP(3),
ADD COLUMN     "deleteAccountOTP" INTEGER;
