CREATE TABLE "PostLike" (
  "profileId" TEXT NOT NULL,
  "postId"    TEXT NOT NULL,
  "likedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostLike_pkey" PRIMARY KEY ("profileId", "postId")
);
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReplyLike" (
  "profileId" TEXT NOT NULL,
  "replyId"   TEXT NOT NULL,
  "likedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReplyLike_pkey" PRIMARY KEY ("profileId", "replyId")
);
CREATE INDEX "ReplyLike_replyId_idx" ON "ReplyLike"("replyId");
ALTER TABLE "ReplyLike" ADD CONSTRAINT "ReplyLike_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplyLike" ADD CONSTRAINT "ReplyLike_replyId_fkey"
  FOREIGN KEY ("replyId") REFERENCES "Reply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SavedPost" (
  "profileId" TEXT NOT NULL,
  "postId"    TEXT NOT NULL,
  "savedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("profileId", "postId")
);
CREATE INDEX "SavedPost_profileId_idx" ON "SavedPost"("profileId");
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
