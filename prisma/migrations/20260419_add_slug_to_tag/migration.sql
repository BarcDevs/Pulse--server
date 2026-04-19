-- Add slug column
ALTER TABLE "Tag" ADD COLUMN "slug" TEXT;

-- Populate slug from name (convert to lowercase, replace spaces with hyphens)
UPDATE "Tag" SET "slug" = LOWER(REPLACE("name", ' ', '-')) WHERE "slug" IS NULL;

-- Make slug NOT NULL and add unique constraint
ALTER TABLE "Tag" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_slug_key" UNIQUE ("slug");
