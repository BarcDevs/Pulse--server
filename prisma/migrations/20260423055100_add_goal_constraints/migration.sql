-- Single primary goal per profile
CREATE UNIQUE INDEX "RecoveryGoal_profileId_isPrimary_key"
ON "RecoveryGoal"("profileId")
WHERE "isPrimary" = true;

-- Single ACTIVE milestone per goal
CREATE UNIQUE INDEX "Milestone_goalId_active_key"
ON "Milestone"("goalId")
WHERE "status" = 'ACTIVE';

-- completedAt required when status = COMPLETED
ALTER TABLE "Milestone"
ADD CONSTRAINT "Milestone_completedAt_check"
CHECK (
  ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL)
  OR ("status" != 'COMPLETED')
);