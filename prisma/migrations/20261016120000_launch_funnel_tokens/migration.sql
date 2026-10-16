-- CreateTable
CREATE TABLE "LaunchFunnelToken" (
    "token" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3),

    CONSTRAINT "LaunchFunnelToken_pkey" PRIMARY KEY ("token")
);
