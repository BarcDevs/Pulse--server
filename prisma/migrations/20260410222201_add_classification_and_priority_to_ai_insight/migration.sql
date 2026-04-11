-- AlterTable
ALTER TABLE "AIInsight" ADD COLUMN "classification" TEXT NOT NULL DEFAULT 'baseline',
ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
