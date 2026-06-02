-- DropIndex
DROP INDEX "HealthInterest_category_sortOrder_idx";

-- AlterTable
ALTER TABLE "HealthInterest" DROP COLUMN "category",
DROP COLUMN "description";
