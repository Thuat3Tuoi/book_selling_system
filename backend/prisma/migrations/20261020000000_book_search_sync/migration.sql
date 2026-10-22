CREATE TABLE "BookSearchSync" (
    "bookId" INTEGER NOT NULL,
    "revision" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookSearchSync_pkey" PRIMARY KEY ("bookId")
);

CREATE INDEX "BookSearchSync_nextAttemptAt_leaseUntil_idx" ON "BookSearchSync"("nextAttemptAt", "leaseUntil");
