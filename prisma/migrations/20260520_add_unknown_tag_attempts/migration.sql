-- CreateTable
CREATE TABLE "UnknownTagAttempt" (
    "id" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnknownTagAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnknownTagAttempt_tagName_key" ON "UnknownTagAttempt"("tagName");

-- CreateIndex
CREATE INDEX "UnknownTagAttempt_count_idx" ON "UnknownTagAttempt"("count");
