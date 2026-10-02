-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "anonymousParticipation" SET DEFAULT false;

-- The column now only stores the last choice made on the post/reply form, and
-- nobody has made one under the new model: reset it so the toggle starts off.
-- Existing posts and replies keep their own isAnonymous flag.
UPDATE "Profile" SET "anonymousParticipation" = false;
