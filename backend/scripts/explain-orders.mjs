// Measures the query shape used by OrdersService.getOrders on synthetic data.
// All benchmark rows/indexes live in a temporary table; real data is read only.
import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
    await db.connect();
    await db.query("BEGIN");
    await db.query("SET LOCAL statement_timeout = '30s'");
    const index = await db.query(`
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = current_schema() AND tablename = 'Order'
          AND indexname = 'Order_userId_createdAt_idx'
    `);
    assert.equal(index.rowCount, 1, "Apply migrations: Order_userId_createdAt_idx is missing");
    assert.ok(index.rows[0].indexdef.includes('("userId", "createdAt" DESC)'), "Unexpected composite index definition");

    await db.query('CREATE TEMP TABLE technology_audit_orders AS SELECT * FROM "Order" WITH NO DATA');
    await db.query(`
        INSERT INTO technology_audit_orders ("id", "userId", "totalAmount", "shippingAddress", "status", "createdAt")
        SELECT g, 1 + (g % 2000), 100, 'Synthetic audit address', 'PENDING',
               timestamp '2026-01-01' + g * interval '1 minute'
        FROM generate_series(1, 40000) AS g
    `);
    await db.query("ANALYZE technology_audit_orders");
    const query = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM technology_audit_orders WHERE "userId" = 1000 ORDER BY "createdAt" DESC`;
    const before = (await db.query(query)).rows[0]["QUERY PLAN"][0];
    await db.query('CREATE INDEX technology_audit_orders_user_created_idx ON technology_audit_orders ("userId", "createdAt" DESC)');
    await db.query("ANALYZE technology_audit_orders");
    const after = (await db.query(query)).rows[0]["QUERY PLAN"][0];
    const usesIndex = (plan) => plan["Index Name"] === "technology_audit_orders_user_created_idx" ||
        (plan.Plans ?? []).some(usesIndex);
    assert.ok(usesIndex(after.Plan), "Planner did not use the composite index");
    assert.equal(before.Plan["Actual Rows"], 20);
    assert.equal(after.Plan["Actual Rows"], 20);
    const report = {
        recordedAt: new Date().toISOString(),
        dataset: { distinctUserIds: 2000, orders: 40000, temporaryTable: true },
        applicationIndex: index.rows[0].indexdef,
        query: 'WHERE "userId" = 1000 ORDER BY "createdAt" DESC',
        before, after,
    };
    const json = JSON.stringify(report, null, 2) + "\n";
    if (process.env.EXPLAIN_OUTPUT) {
        await mkdir(dirname(process.env.EXPLAIN_OUTPUT), { recursive: true });
        await writeFile(process.env.EXPLAIN_OUTPUT, json);
    }
    console.log(json);
    await db.query("ROLLBACK");
} finally {
    await db.end();
}
