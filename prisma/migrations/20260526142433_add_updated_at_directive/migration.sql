-- AlterTable Post updatedAt
ALTER TABLE "Post" DROP COLUMN "updatedAt";
ALTER TABLE "Post" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- AlterTable Reply updatedAt
ALTER TABLE "Reply" DROP COLUMN "updatedAt";
ALTER TABLE "Reply" ADD COLUMN "updatedAt" TIMESTAMP(3);
