# PostgreSQL EXPLAIN ANALYZE — 2026-10-20

Môi trường: PostgreSQL 17 Alpine trong container tạm `codex-nest-audit-20261020`, database `review`. Không dùng database/volume của project. Dữ liệu kiểm thử sinh riêng: 2.000 user, 40.000 order (20 order/user), 10.000 book (95% ACTIVE). `ANALYZE` được chạy sau khi nạp dữ liệu và sau khi tạo index. Truy vấn tương ứng với `OrdersService.getOrders` và `BooksService.getBooks`. Đây là một lần đo trên dữ liệu tổng hợp, không phải benchmark production.

## Order: `WHERE userId = 1000 ORDER BY createdAt DESC LIMIT 20`

Trước khi tạo `Order_userId_createdAt_idx`:

```text
Limit  (actual time=1.477..1.481 rows=20 loops=1)
  Buffers: shared hit=377
  -> Sort (actual time=1.475..1.476 rows=20 loops=1)
       Sort Key: "createdAt" DESC
       -> Seq Scan on "Order" (actual time=0.055..1.436 rows=20 loops=1)
            Filter: ("userId" = 1000)
            Rows Removed by Filter: 39980
Planning Time: 0.518 ms
Execution Time: 1.535 ms
```

Sau khi tạo `CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC)`:

```text
Limit  (actual time=0.055..0.057 rows=20 loops=1)
  Buffers: shared hit=20 read=2
  -> Sort (actual time=0.054..0.055 rows=20 loops=1)
       Sort Key: "createdAt" DESC
       -> Bitmap Heap Scan on "Order" (actual time=0.024..0.043 rows=20 loops=1)
            Recheck Cond: ("userId" = 1000)
            Heap Blocks: exact=20
            -> Bitmap Index Scan on "Order_userId_createdAt_idx" (actual time=0.017..0.017 rows=20 loops=1)
                 Index Cond: ("userId" = 1000)
Planning Time: 0.165 ms
Execution Time: 0.087 ms
```

Plan chuyển từ quét tuần tự 40.000 hàng sang quét index và 20 heap block. Một lần đo không đủ để hứa hẹn tỷ lệ tăng tốc trên production; planner vẫn chọn sort nhỏ vì mỗi user có 20 đơn.

## Book: `WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 20`

Trước index `(status, id DESC)`:

```text
Limit  (actual time=0.023..0.028 rows=20 loops=1)
  Buffers: shared hit=3
  -> Index Scan Backward using "Book_pkey" on "Book" (actual time=0.022..0.026 rows=20 loops=1)
       Filter: (status = 'ACTIVE'::text)
       Rows Removed by Filter: 2
Execution Time: 0.042 ms
```

Sau khi tạo thử index `(status, id DESC)`:

```text
Limit  (actual time=0.011..0.015 rows=20 loops=1)
  Buffers: shared hit=3
  -> Index Scan Backward using "Book_pkey" on "Book" (actual time=0.010..0.013 rows=20 loops=1)
       Filter: (status = 'ACTIVE'::text)
       Rows Removed by Filter: 2
Execution Time: 0.026 ms
```

Planner tiếp tục dùng primary key, nên index Book thử nghiệm đã được loại khỏi migration để tránh chi phí ghi dữ liệu không cần thiết. Chênh lệch thời gian giữa hai lần đo không thể quy cho index này.

## Migration

Sau khi sửa migration theo kết quả plan, đã tạo database tạm mới `review2` trong cùng container và chạy `prisma migrate deploy` từ đầu: cả 6 migration áp dụng thành công. `prisma migrate status` trả `Database schema is up to date!`.
