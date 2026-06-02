-- AlterTable: add healthInterests array to Profile
ALTER TABLE "Profile" ADD COLUMN "healthInterests" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data: copy slugs from junction table to Profile array
UPDATE "Profile" p
SET "healthInterests" = (
    SELECT ARRAY_AGG(hi.slug ORDER BY phi."addedAt")
    FROM "ProfileHealthInterest" phi
    JOIN "HealthInterest" hi ON hi.id = phi."healthInterestId"
    WHERE phi."profileId" = p.id
)
WHERE EXISTS (
    SELECT 1 FROM "ProfileHealthInterest" WHERE "profileId" = p.id
);

-- DropForeignKey
ALTER TABLE "ProfileHealthInterest" DROP CONSTRAINT "ProfileHealthInterest_healthInterestId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileHealthInterest" DROP CONSTRAINT "ProfileHealthInterest_profileId_fkey";

-- DropTable
DROP TABLE "ProfileHealthInterest";

-- DropTable
DROP TABLE "HealthInterest";
