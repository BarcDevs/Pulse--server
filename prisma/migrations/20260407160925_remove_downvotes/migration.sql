-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "votes" SET DEFAULT '{"upvotedBy": [], "upvotes": 0}';

-- AlterTable
ALTER TABLE "Reply" ALTER COLUMN "votes" SET DEFAULT '{"upvotedBy": [], "upvotes": 0}';
