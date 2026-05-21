DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'RecoveryGoal') THEN
    -- Drop constraint if it exists
    ALTER TABLE "RecoveryGoal" DROP CONSTRAINT IF EXISTS "RecoveryGoal_profileId_fkey";

    -- Migrate data: map userId to profileId from Profile table
    UPDATE "RecoveryGoal" rg
    SET "profileId" = p.id
    FROM "Profile" p
    WHERE p."userId" = rg."userId";

    -- Make profileId NOT NULL
    ALTER TABLE "RecoveryGoal" ALTER COLUMN "profileId" SET NOT NULL;

    -- Re-add foreign key constraint
    ALTER TABLE "RecoveryGoal" ADD CONSTRAINT "RecoveryGoal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE;

    -- Drop old userId foreign key if it exists
    ALTER TABLE "RecoveryGoal" DROP CONSTRAINT IF EXISTS "RecoveryGoal_userId_fkey";

    -- Drop old userId column if it exists
    ALTER TABLE "RecoveryGoal" DROP COLUMN IF EXISTS "userId";

    -- Drop old userId index
    DROP INDEX IF EXISTS "RecoveryGoal_userId_idx";

    -- Add new profileId index
    CREATE INDEX IF NOT EXISTS "RecoveryGoal_profileId_idx" ON "RecoveryGoal"("profileId");
  END IF;
END $$;
