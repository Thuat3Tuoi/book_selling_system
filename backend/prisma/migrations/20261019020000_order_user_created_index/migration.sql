-- Supports GET /orders filtered by userId and sorted by newest first.
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC);
