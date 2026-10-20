-- Evolve the existing order outbox so the same publisher can deliver book events.
ALTER TABLE "OutboxEvent"
    ADD COLUMN "topic" TEXT,
    ADD COLUMN "lockedUntil" TIMESTAMP(3),
    ADD COLUMN "lastError" TEXT;

UPDATE "OutboxEvent"
SET "topic" = "eventType"::TEXT,
    "publishedAt" = CASE
        WHEN "status" = 'PUBLISHED' AND "publishedAt" IS NULL THEN "createdAt"
        ELSE "publishedAt"
    END;

-- Older order events used orderId; the current consumer reads the order's id.
UPDATE "OutboxEvent"
SET "payload" = jsonb_set("payload", '{id}', "payload"->'orderId')
WHERE "topic" = 'order.created'
  AND "payload" ? 'orderId'
  AND NOT "payload" ? 'id';

ALTER TABLE "OutboxEvent"
    ALTER COLUMN "topic" SET NOT NULL,
    DROP COLUMN "eventType",
    DROP COLUMN "status";

CREATE INDEX "OutboxEvent_publishedAt_nextAttemptAt_idx" ON "OutboxEvent"("publishedAt", "nextAttemptAt");
DROP INDEX "Session_ref_idx";
