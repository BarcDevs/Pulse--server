-- Delete duplicate insights, keeping only the most recent one per (checkInId, type)
DELETE FROM "AIInsight" a
WHERE a.id NOT IN (
    SELECT MAX(id) FROM "AIInsight"
    GROUP BY "checkInId", "type"
);

-- Add unique constraint on (checkInId, type) to prevent duplicate insights per check-in
-- This ensures idempotent insight generation: only one insight of each type per check-in
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_checkInId_type_key" UNIQUE ("checkInId", "type");