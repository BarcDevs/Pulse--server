-- CreateTable PostRecommendation
CREATE TABLE "PostRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generationPending" BOOLEAN NOT NULL DEFAULT false,
    "pendingSince" TIMESTAMP(3),

    CONSTRAINT "PostRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostRecommendation_checkInId_key" ON "PostRecommendation"("checkInId");

-- CreateIndex
CREATE INDEX "PostRecommendation_userId_idx" ON "PostRecommendation"("userId");

-- AddForeignKey
ALTER TABLE "PostRecommendation" ADD CONSTRAINT "PostRecommendation_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "DailyCheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;