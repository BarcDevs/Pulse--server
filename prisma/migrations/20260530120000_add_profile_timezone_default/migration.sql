-- Backfill existing NULL timezones before making column non-nullable
UPDATE "Profile" SET "timezone" = 'Asia/Jerusalem' WHERE "timezone" IS NULL;

-- AlterTable
ALTER TABLE "Profile"
    ALTER COLUMN "timezone" SET NOT NULL,
    ALTER COLUMN "timezone" SET DEFAULT 'Asia/Jerusalem';
