-- AddColumn: pausedAt, completedAt, abandonedAt to RecoveryGoal
ALTER TABLE "RecoveryGoal" ADD COLUMN "pausedAt" TIMESTAMP(3);
ALTER TABLE "RecoveryGoal" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "RecoveryGoal" ADD COLUMN "abandonedAt" TIMESTAMP(3);
