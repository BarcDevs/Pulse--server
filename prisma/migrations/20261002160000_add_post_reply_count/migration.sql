-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "replyCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill from the existing replies (replies are never removed by a user purge,
-- so the counter only changes on reply create/delete)
UPDATE "Post" p
SET "replyCount" = c.n
FROM (
    SELECT "postId", COUNT(*)::int AS n
    FROM "Reply"
    GROUP BY "postId"
) c
WHERE c."postId" = p.id;

-- CreateIndex
CREATE INDEX "Post_replyCount_idx" ON "Post"("replyCount");
