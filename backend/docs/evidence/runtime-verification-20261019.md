# Kiểm chứng runtime tiếp nối audit rubric — 19/10/2026

**Commit mã đã kiểm chứng:** `2a073012add457f5238f05055ee491f4031e54d8`. Clone sạch từ commit này chạy Compose một lệnh với project riêng `bookauditsha2a07301`; backend image digest `sha256:ccd6f53e545ce283bf845ab71eb5a6ad11181baee9659e447263f25f716b38f2`, `/health` 200, `/api-docs-json` 200, migration 9/9 và E2E 15/15. [CI run #79](https://github.com/Thuat3Tuoi/book_selling_system/actions/runs/39278199124) được tạo cho commit này nhưng còn queued khi ghi báo cáo, nên chưa tính là đạt.

Báo cáo này tiếp nối [audit ban đầu](rubric-audit-20261019.md). Môi trường thử nghiệm là Docker Compose project riêng `bookaudit20261019`, dùng volume và cổng riêng (`31011` API, `15432` PostgreSQL, `16379` Redis, `15673` RabbitMQ, `17700` Meilisearch). Các container `book-selling-backend-*` đang có trên máy không được dùng làm nơi thử nghiệm. Mật khẩu thử nghiệm được sinh ngẫu nhiên và giữ ngoài repository. Không có nhận xét tuần 5 trong file chuẩn, nên các trạng thái dưới đây đánh giá bản hiện tại, không gán nhãn đã sửa góp ý cũ.

## Kết quả đã chạy

| Kiểm chứng | Kết quả thực tế |
| --- | --- |
| Docker build | Lần đầu phát hiện lockfile không tương thích npm 10 trong image (`typescript@5.9.3` thiếu). Tái tạo lockfile bằng npm 10, build image migrate/runtime thành công. Lần khởi động đầu phát hiện `JwtAuthGuard` thiếu Passport provider trong NotificationsModule; đã sửa cùng OrderItemsModule rồi khởi động lại. |
| Prisma migration | `prisma migrate deploy` trên database `bookaudit`: 9/9 migration áp dụng, gồm outbox, enum, composite index. Không áp migration lên database mặc định đang chạy. |
| Seed | `prisma:seed:safe` tạo 3 role, hai customer, một staff, một sách. Không chạy seed xóa dữ liệu. |
| HTTP và OpenAPI | `/health` 200, `/books` 200 với envelope `{success,data,meta}`, `/api-docs-json` 200. Sau bổ sung schema, 28/28 operation có response schema; endpoint cần bearer vẫn có metadata bảo mật. |
| Backend unit/API | `npm test`: **187/187** ca qua, 27 file; `npm run lint`, `npm run build`, `npx tsc --noEmit --incremental false` qua. |
| HTTP E2E trên dịch vụ thật | `npm run test:e2e`: **15/15** ca qua, 4 file. `E2E_ISOLATED_DB=YES` bắt buộc. Ca mới gọi image backend qua HTTP, dùng hai customer và staff: 401 chưa đăng nhập, 403 role, 404 đọc/sửa chéo, 400 giá âm/field dư/thiếu trường, 201 sách và đơn, cart tách người dùng, cache invalidation, Meilisearch, notification từ broker, cookie Origin chống CSRF. |
| Frontend | `npm run build` chạy lại sau sửa code: Next.js compile, TypeScript và static generation đều qua. |

## PostgreSQL — truy vấn đơn hàng

Đã tạo 50.000 đơn giả lập **chỉ trong database thử nghiệm**; tổng 50.001 đơn, trong đó customer A có 1.001 đơn, customer B có 49.000 đơn. Truy vấn đo giống phần lọc/sắp xếp của `GET /orders`: `WHERE "userId" = ? ORDER BY "createdAt" DESC`. Ở pha “trước”, index `Order_userId_createdAt_idx` chỉ bị bỏ **trong transaction đã rollback**, nên migration vẫn nguyên.

| Trạng thái | Plan chính | Shared buffers | Execution time |
| --- | --- | ---: | ---: |
| Trước index | Seq Scan + Sort; bỏ qua 49.000 dòng | 471 hits | 2,416 ms |
| Sau index | Bitmap Index Scan + Bitmap Heap Scan + Sort | 15 hits | 0,339 ms |

Plan đầy đủ và SQL: [explain-orders-20261019.txt](explain-orders-20261019.txt). Đây là phép đo trên một dataset thử nghiệm, không đại diện cho latency production; PostgreSQL vẫn chọn Sort vì truy vấn trả toàn bộ đơn của user.

## RabbitMQ, outbox và DLQ

1. Dừng riêng RabbitMQ của project audit, gọi `POST /orders` cho customer A: HTTP 201, đơn `50002` được commit. Trong thời gian broker dừng, outbox có `attempts=1`, notification đếm được **0**.
2. Bật RabbitMQ lại: outbox chuyển `PUBLISHED`, `attempts=3`; notification của đơn `50002` đếm được **1**.
3. Đặt lại chính event đó thành `PENDING` trong database thử nghiệm để phát trùng: sau xử lý outbox lại `PUBLISHED`; notification theo `eventId` vẫn **1** nhờ unique constraint.
4. Đẩy một message hợp lệ về envelope nhưng có `userId` không tồn tại vào queue thử nghiệm: consumer `nack(false,false)`; queue `book_audit_queue.outbox-v1.dlq` có **1** message và database có **0** notification cho event lỗi.

Outbox hiện giữ event `PENDING` và retry với backoff tối đa 5 phút khi broker lỗi, không dừng sau lần thứ năm. Đây là giao nhận **ít nhất một lần ở tầng ứng dụng**, nên consumer phải giữ idempotency. DLQ cần người vận hành xem và quyết định replay; chưa có cơ chế xử lý tự động message độc hại.

## Redis, cron và Meilisearch

- Redis: `book:1` và danh sách sách có TTL **300 giây**. Dừng Redis, sửa giá sách mẫu từ 150000 thành 150001: PATCH và GET vẫn 200 với giá mới từ PostgreSQL. Sau khi Redis kết nối lại, pending invalidation xóa cache cũ; giá trị cache và GET đều là 150001. E2E xác nhận giỏ A/B không lẫn dữ liệu.
- Cron: hai AppModule instance gọi `sendNotification()` đồng thời trên database thử nghiệm. `Notification.eventId` duy nhất theo ngày `Asia/Ho_Chi_Minh` khiến chỉ có **1** notification không rỗng. Cron dùng staff khi chưa có admin đang hoạt động.
- Meilisearch: dừng search rồi sửa tiêu đề sách; PATCH DB thành công, search sau khi bật lại có **0** hit mới. Chạy `search:reindex` đồng bộ 3 sách ACTIVE trong 478 ms, sau đó query có **1** hit đúng. Phục hồi search hiện là thao tác thủ công; khi service lỗi, DB và index có thể lệch tới lúc reindex.

## Đánh giá lại 23 tiêu chí

| ID | Trước runtime | Sau runtime | Bằng chứng / giới hạn |
| --- | --- | --- | --- |
| A1 | ✅ | ✅ | NestJS bootstrap, image chạy khỏe |
| F1 | ✅ | ✅ | Module DI chạy sau khi bổ sung PassportModule thiếu |
| F2 | ✅ | ✅ | 28 operation HTTP từ controller |
| F3 | ✅ | ✅ | Provider/DI khởi tạo trong container |
| F4 | ✅ | ✅ | POST /books: 400 giá âm/field dư/thiếu; 201 payload đúng |
| F5 | 🟡 | ✅ | JWT + ownership/RBAC hai customer/staff: 401/403/404/200/201 |
| F6 | ✅ | ✅ | Response envelope và filter kiểm tra qua HTTP |
| C1.1 | 🟡 | ✅ | TTL, cache hit/miss, invalidation, outage/recovery thực |
| C1.2 | ❌ | ✅ | EXPLAIN ANALYZE trước/sau có plan và thời gian |
| C1.3 | 🟡 | ✅ | Migration áp dụng, Bitmap Index Scan thực |
| C2.1 | 🟡 | ✅ | Broker outage/recovery, phát trùng, DLQ thực; DLQ cần xử lý vận hành |
| C2.2 | 🟡 | ✅ | Hai instance, eventId theo ngày, một notification |
| C4 | 🟡 | 🟡 | Index/search thực; phục hồi sau lỗi vẫn cần reindex thủ công |
| D1 | 🟡 | 🟡 | Có Git/PR cũ; chưa có review chéo được xác nhận cho nhánh hiện tại |
| D2 | 🟡 | ✅ | Clone sạch `2a07301`, một lệnh Compose khởi động toàn bộ stack và migration |
| D3 | 🟡 | 🟡 | Không có `.env`/key track trong HEAD hoặc tên file history; chưa quét toàn bộ blob history |
| D4 | 🟡 | ✅ | 187 unit/API + 15 E2E trên service thật |
| D5 | 🟡 | 🟡 | Workflow có test/build cả backend/frontend; chưa có run cho SHA mới |
| D6 | 🟡 | 🟡 | JWT/RBAC/ownership, cookie Origin, CORS và lỗi 500; chưa có pentest độc lập |
| D7 | 🟡 | ✅ | README/Swagger; 28/28 operation có response schema |
| D8 | ✅ | ✅ | AI Disclosure đã có; mức sử dụng thực tế do nhóm xác nhận |
| E1 | 🟡 | ✅ | Image build từ clone sạch `2a07301`, healthy, API 200; digest ghi ở đầu báo cáo |
| E2 | 🟡 | 🟡 | Cùng workflow D5; run cho SHA mới chưa có |

**Sau khi chốt SHA: 17 ✅, 6 🟡, 0 ❌ trên 23 tiêu chí.** D5/E2 vẫn chờ GitHub Actions hoàn thành; D1 cần review thật. Báo cáo phân biệt rõ phép thử trên working tree với image build từ clone sạch.

## Việc cần hoàn tất

1. Chờ GitHub Actions của nhánh mới hoàn tất; review chéo/branch rule do chủ repository xác nhận.
2. Nếu muốn C4 tự hồi phục, bổ sung hàng đợi đồng bộ search hoặc cơ chế reindex định kỳ có giám sát; hiện manual reindex đã được kiểm chứng.
3. Quét secret toàn history bằng công cụ chuyên dụng và thực hiện pentest có phạm vi; đây là giới hạn của audit mã nguồn hiện tại.
