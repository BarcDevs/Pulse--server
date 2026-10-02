-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: keep what each item looked like under the old profile-wide setting
UPDATE "Post" p
SET "isAnonymous" = pr."anonymousParticipation"
FROM "Profile" pr
WHERE pr.id = p."authorId";

UPDATE "Reply" r
SET "isAnonymous" = pr."anonymousParticipation"
FROM "Profile" pr
WHERE pr.id = r."authorId";
