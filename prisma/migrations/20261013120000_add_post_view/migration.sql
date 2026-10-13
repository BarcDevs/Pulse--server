-- CreateTable
CREATE TABLE "PostView" (
    "profileId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostView_pkey" PRIMARY KEY ("profileId","postId")
);

-- CreateIndex
CREATE INDEX "PostView_postId_idx" ON "PostView"("postId");

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
