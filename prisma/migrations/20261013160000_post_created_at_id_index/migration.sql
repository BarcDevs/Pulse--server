-- CreateIndex
CREATE INDEX "Post_createdAt_id_idx" ON "Post"("createdAt" DESC, "id" DESC);

-- DropIndex
DROP INDEX "Post_createdAt_idx";
