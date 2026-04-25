-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('PHYSICAL', 'MENTAL', 'LIFESTYLE');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('LOCKED', 'ACTIVE', 'COMPLETED');

-- CreateTable RecoveryGoal
CREATE TABLE "RecoveryGoal" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable Milestone
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'LOCKED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecoveryGoal" ADD CONSTRAINT "RecoveryGoal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "RecoveryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddIndex
CREATE INDEX "RecoveryGoal_profileId_idx" ON "RecoveryGoal"("profileId");
CREATE UNIQUE INDEX "Milestone_goalId_order_key" ON "Milestone"("goalId", "order");
CREATE INDEX "Milestone_goalId_idx" ON "Milestone"("goalId");
