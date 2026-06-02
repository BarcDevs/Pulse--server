-- AlterTable: add activityPreferences array to Profile
ALTER TABLE "Profile" ADD COLUMN "activityPreferences" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data: copy slugs from junction table to Profile array
UPDATE "Profile" p
SET "activityPreferences" = (
    SELECT ARRAY_AGG(ap.slug ORDER BY pap."addedAt")
    FROM "ProfileActivityPreference" pap
    JOIN "ActivityPreference" ap ON ap.id = pap."activityPreferenceId"
    WHERE pap."profileId" = p.id
)
WHERE EXISTS (
    SELECT 1 FROM "ProfileActivityPreference" WHERE "profileId" = p.id
);

-- DropForeignKey
ALTER TABLE "ProfileActivityPreference" DROP CONSTRAINT "ProfileActivityPreference_activityPreferenceId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileActivityPreference" DROP CONSTRAINT "ProfileActivityPreference_profileId_fkey";

-- DropTable
DROP TABLE "ProfileActivityPreference";

-- DropTable
DROP TABLE "ActivityPreference";

-- Down migration (manual rollback if needed):
-- CREATE TABLE "ActivityPreference" (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT, category TEXT, sortOrder INT, isActive BOOLEAN, createdAt TIMESTAMP, updatedAt TIMESTAMP);
-- CREATE TABLE "ProfileActivityPreference" (profileId TEXT NOT NULL, activityPreferenceId TEXT NOT NULL, addedAt TIMESTAMP DEFAULT NOW(), PRIMARY KEY (profileId, activityPreferenceId));
-- Repopulate from Profile.activityPreferences array and drop the column.
