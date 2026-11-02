# Hướng dẫn kiểm thử backend và dịch vụ

Các lệnh npm dưới đây được chạy tại `backend/` bằng Bash trên Linux hoặc Git Bash trên Windows. Lệnh Docker được chạy tại thư mục gốc repository, nơi chứa `compose.yaml`.

## 1. Kiểm tra mã nguồn

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test
```

Các test trong `src/**/*.spec.ts` sử dụng mock cho các dịch vụ phụ thuộc. `build` tạo Prisma Client và biên dịch ứng dụng vào `dist/`.

## 2. Chuẩn bị môi trường kiểm thử tích hợp

Dùng PostgreSQL, Redis, RabbitMQ và Meilisearch riêng cho kiểm thử. Các địa chỉ kết nối phải truy cập được từ tiến trình Node.js chạy test. Compose mặc định giữ dịch vụ dữ liệu trong mạng nội bộ; để chạy test từ host, dùng dịch vụ thử riêng hoặc override chỉ mở cổng thử trên `127.0.0.1`.

Đặt các biến trong môi trường hoặc `backend/.env`:

| Biến | Cách cấu hình |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL của database thử, schema `public` |
| `REDIS_HOST`, `REDIS_PORT` | Địa chỉ và cổng Redis thử |
| `REDIS_PASSWORD` | Mật khẩu Redis nếu dịch vụ yêu cầu |
| `RABBITMQ_URL`, `RABBITMQ_QUEUE` | URL broker và queue riêng cho kiểm thử |
| `RABBITMQ_DURABLE`, `RABBITMQ_PERSISTENT` | Đặt `true` |
| `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` | Địa chỉ Meilisearch và khóa nếu dịch vụ yêu cầu |
| `JWT_SECRET` | Secret riêng của môi trường thử |
| `CORS_ORIGINS` | Origin frontend được phép, ví dụ `http://localhost:3000` |
| `SEED_DEFAULT_PASSWORD` | Mật khẩu dùng để khởi tạo tài khoản mẫu |

Tạo schema và dữ liệu mẫu:

```bash
npx prisma migrate deploy
NODE_ENV=test DEMO_SEED_ENABLED=true npm run prisma:seed:safe
```

Seed giữ nguyên mật khẩu của tài khoản đã tồn tại. Mật khẩu staff trong database thử phải khớp `SEED_DEFAULT_PASSWORD` hoặc `E2E_SAMPLE_PASSWORD` được truyền cho test.

## 3. Chạy toàn bộ kiểm thử tích hợp

Sau bước build và chuẩn bị môi trường:

```bash
E2E_ISOLATED_DB=YES NODE_ENV=test npm run test:runtime
```

Lệnh tự khởi động API trên cổng trống, đợi `/health`, chạy E2E và dừng tiến trình API do lệnh tạo. Các nhóm kiểm tra gồm:

- Đăng ký, đăng nhập, validation, rate limit và refresh cookie.
- Quyền truy cập sách, giỏ hàng, đơn hàng và thông báo.
- Redis key, TTL và cập nhật cache khi dữ liệu thay đổi.
- Meilisearch: tìm từ khóa, lọc thể loại, sắp xếp giá, phân trang và ngừng bán sách.
- Tác vụ thông báo tồn kho thấp khi nhiều instance gọi đồng thời.
- RabbitMQ: sự kiện trùng, retry và chuyển thông điệp lỗi vào dead queue.
- PostgreSQL: index tổ hợp và query plan trên dữ liệu tổng hợp.

Các suite E2E chạy tuần tự vì dùng chung dịch vụ. Cờ `E2E_ISOLATED_DB=YES` xác nhận cấu hình trỏ tới môi trường thử; lệnh không tự tạo hoặc xóa database, broker hay volume.

## 4. Kiểm thử với API có sẵn

API phải dùng cùng database, Redis và broker thử với cấu hình của tiến trình test. Đặt `E2E_BASE_URL` theo địa chỉ API và `E2E_ALLOWED_ORIGIN` theo một origin trong `CORS_ORIGINS`, rồi chạy:

```bash
E2E_ISOLATED_DB=YES NODE_ENV=test npm run test:e2e
```

`test:e2e` không tự khởi động API. Khi thiếu `E2E_BASE_URL`, suite HTTP mua hàng bị bỏ qua; dùng `test:runtime` để chạy đầy đủ mà không cần quản lý tiến trình API riêng.

## 5. Đo truy vấn PostgreSQL

```bash
EXPLAIN_OUTPUT=artifacts/orders-explain.json npm run db:explain
```

Script xác nhận `Order_userId_createdAt_idx` có trong schema, tạo bảng tạm chứa 40.000 đơn với 2.000 userId và chạy `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` trước/sau index tương đương. Điều kiện truy vấn là lọc theo `userId` và sắp `createdAt` giảm dần.

Đọc `Node Type`, `Index Name`, `Actual Rows`, `Execution Time` và các trường buffers để so sánh plan. Script kiểm tra index được planner sử dụng, không áp đặt tỷ lệ tăng tốc. Phép đo dùng dữ liệu tổng hợp, không bao gồm truy vấn lấy order item/book của Prisma.

Bảng tạm và index thử được rollback; dữ liệu và index của bảng `Order` không bị sửa. Nếu bỏ `EXPLAIN_OUTPUT`, JSON được in ra terminal.

## 6. Thu thập phản hồi tìm kiếm và giỏ hàng

Với API thử đã chạy và có sách đang bán, đặt `EVIDENCE_BASE_URL` theo địa chỉ API rồi chạy:

```bash
npm run evidence
```

Script thực hiện các truy vấn tìm kiếm và thao tác giỏ hàng, ghi đầu ra vào `artifacts/search-meilisearch.md` và `artifacts/cart-operations.md`. Có thể đặt `EVIDENCE_EMAIL`, `EVIDENCE_PASSWORD`, `EVIDENCE_QUERIES` và `EVIDENCE_CATEGORY` để chọn tài khoản hoặc truy vấn. Nếu không có thông tin tài khoản, script tự đăng ký một tài khoản thử qua API.

`artifacts/` được Git bỏ qua và dùng cho đầu ra chạy thực tế. Tài liệu hướng dẫn chỉ mô tả lệnh, điều kiện và kết quả mong đợi.

## 7. Kiểm tra trong Docker và CI

- [Docker backend](../DOCKER.md): khởi động, health, log và dừng dịch vụ.
- [Redis](../src/redis/README.md): key cache, TTL và xử lý mất kết nối.
- [RabbitMQ](../src/infrastructure/rabbitmq/README.md): queue, outbox và notification.
- [Meilisearch](../src/search/README.md): API tìm kiếm và reindex.
- [Prisma](../src/prisma/README.md): migration và seed.

[GitHub Actions](../../.github/workflows/backend-ci.yml) chạy build/test khi push hoặc mở pull request, khởi tạo dịch vụ thử cho backend và tải query plan lên artifact `postgres-explain`. Đọc log và artifact của workflow tương ứng trong mục Actions của repository.
