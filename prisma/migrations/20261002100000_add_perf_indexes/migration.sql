-- DropIndex
DROP INDEX "PostRecommendation_userId_idx";

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_views_idx" ON "Post"("views");

-- CreateIndex
CREATE INDEX "Reply_postId_createdAt_idx" ON "Reply"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostRecommendation_userId_generatedAt_idx" ON "PostRecommendation"("userId", "generatedAt");
