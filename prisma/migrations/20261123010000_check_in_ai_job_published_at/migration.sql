-- Set when the broker confirmed the job message; null means not published yet
ALTER TABLE "CheckInAiJob" ADD COLUMN "publishedAt" TIMESTAMP(3);
