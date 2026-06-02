/*
  Warnings:

  - You are about to drop the column `votes` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `votes` on the `Reply` table. All the data in the column will be lost.
  - You are about to drop the `_TagToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Reply" DROP CONSTRAINT "Reply_postId_fkey";

-- DropForeignKey
ALTER TABLE "_TagToUser" DROP CONSTRAINT "_TagToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_TagToUser" DROP CONSTRAINT "_TagToUser_B_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "votes";

-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "language" SET DEFAULT 'he-IL';

-- AlterTable
ALTER TABLE "Reply" DROP COLUMN "votes";

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "nameHe" DROP DEFAULT;

-- DropTable
DROP TABLE "_TagToUser";

-- CreateTable
CREATE TABLE "ProfileToTag" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileToTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileToTag_profileId_idx" ON "ProfileToTag"("profileId");

-- CreateIndex
CREATE INDEX "ProfileToTag_tagId_idx" ON "ProfileToTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileToTag_profileId_tagId_key" ON "ProfileToTag"("profileId", "tagId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Reply_authorId_idx" ON "Reply"("authorId");

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileToTag" ADD CONSTRAINT "ProfileToTag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileToTag" ADD CONSTRAINT "ProfileToTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
