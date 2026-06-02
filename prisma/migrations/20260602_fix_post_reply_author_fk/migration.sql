-- Drop old foreign keys
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";
ALTER TABLE "Reply" DROP CONSTRAINT "Reply_authorId_fkey";

-- Add new foreign keys referencing Profile
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reply" ADD CONSTRAINT "Reply_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
