/*
  Warnings:

  - You are about to drop the column `lastPasswordUpdateAt` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password_updated_at` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_email_created_at_active_idx";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "lastPasswordUpdateAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "password_updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "User_email_createdAt_active_idx" ON "User"("email", "createdAt", "active");
