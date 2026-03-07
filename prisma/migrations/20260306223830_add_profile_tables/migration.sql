/*
  Warnings:

  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "image",
DROP COLUMN "timezone";

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "image" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthInterest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityPreference" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileHealthInterest" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "healthInterestId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileHealthInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileActivityPreference" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "activityPreferenceId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileActivityPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthInterest_slug_key" ON "HealthInterest"("slug");

-- CreateIndex
CREATE INDEX "HealthInterest_isActive_idx" ON "HealthInterest"("isActive");

-- CreateIndex
CREATE INDEX "HealthInterest_category_sortOrder_idx" ON "HealthInterest"("category", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityPreference_slug_key" ON "ActivityPreference"("slug");

-- CreateIndex
CREATE INDEX "ActivityPreference_isActive_idx" ON "ActivityPreference"("isActive");

-- CreateIndex
CREATE INDEX "ActivityPreference_category_sortOrder_idx" ON "ActivityPreference"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "ProfileHealthInterest_profileId_idx" ON "ProfileHealthInterest"("profileId");

-- CreateIndex
CREATE INDEX "ProfileHealthInterest_healthInterestId_idx" ON "ProfileHealthInterest"("healthInterestId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileHealthInterest_profileId_healthInterestId_key" ON "ProfileHealthInterest"("profileId", "healthInterestId");

-- CreateIndex
CREATE INDEX "ProfileActivityPreference_profileId_idx" ON "ProfileActivityPreference"("profileId");

-- CreateIndex
CREATE INDEX "ProfileActivityPreference_activityPreferenceId_idx" ON "ProfileActivityPreference"("activityPreferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileActivityPreference_profileId_activityPreferenceId_key" ON "ProfileActivityPreference"("profileId", "activityPreferenceId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileHealthInterest" ADD CONSTRAINT "ProfileHealthInterest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileHealthInterest" ADD CONSTRAINT "ProfileHealthInterest_healthInterestId_fkey" FOREIGN KEY ("healthInterestId") REFERENCES "HealthInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileActivityPreference" ADD CONSTRAINT "ProfileActivityPreference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileActivityPreference" ADD CONSTRAINT "ProfileActivityPreference_activityPreferenceId_fkey" FOREIGN KEY ("activityPreferenceId") REFERENCES "ActivityPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
