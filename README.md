# Book Selling System

NestJS API và giao diện Next.js cho bán sách. Backend dùng PostgreSQL/Prisma, Redis, RabbitMQ và Meilisearch.

## Khởi chạy

Yêu cầu Node.js 22, npm, Docker Desktop. Sao chép `backend/.env.example` thành `backend/.env`, điền các secret còn trống, không commit file này.

Trong thư mục `backend`:

```bash
npm ci
npm run prisma:generate
docker compose config --quiet
docker compose up -d --build
docker compose ps --all
```

Compose chạy PostgreSQL, Redis, RabbitMQ, Meilisearch và Prisma migration trước backend. Migration ghi vào database; cần xem migration và chọn môi trường phù hợp trước khi chạy. API mặc định: `http://localhost:3001`; health: `/health`. Xem [hướng dẫn Docker](backend/DOCKER.md).

Trong `frontend`, sao chép `frontend/.env.example` thành `frontend/.env`, đặt `NEXT_PUBLIC_API_URL=http://localhost:3001`, rồi chạy `npm ci` và `npm run dev`. Backend đọc `CORS_ORIGINS` (danh sách cách nhau bằng dấu phẩy; mặc định `http://localhost:3000`).

## Tài khoản và dữ liệu mẫu

Chỉ trên **database phát triển tách biệt**, đặt `SEED_DEFAULT_PASSWORD` và `SEED_SAMPLE_DATA=YES` trong `backend/.env`, rồi chạy `docker compose --profile tools run --rm seed-safe` trong `backend`. Nếu có PostgreSQL độc lập, có thể đặt thêm `DATABASE_URL` rồi chạy `npm run prisma:seed:safe`. Script chỉ tạo role, hai customer, một staff và một sách nếu chưa có; không xóa hoặc ghi đè bản ghi trùng. Email mẫu: `customer-a@bookstore.example.com`, `customer-b@bookstore.example.com`, `staff@bookstore.example.com`. Mật khẩu do bạn đặt trong `SEED_DEFAULT_PASSWORD`.

Script cũ `npm run prisma:seed` **xóa và tạo lại dữ liệu**; nó yêu cầu `SEED_RESET_DATA=YES_I_UNDERSTAND`. Chỉ dùng trên database thử nghiệm có thể bỏ dữ liệu.

## Kiểm thử và tài liệu API

Backend: `npm run lint`, `npm run build`, `npm test`, `npx prisma validate`. Frontend: `npm run build`. `npm run test:e2e` tạo/sửa/xóa bản ghi; chỉ chạy với database thử nghiệm riêng và đặt `E2E_ISOLATED_DB=YES`, `DATABASE_URL`, các biến kết nối Redis/RabbitMQ/Meilisearch. Để chạy thêm luồng mua hàng qua container, đặt `E2E_BASE_URL` và `E2E_SAMPLE_PASSWORD` trùng mật khẩu seed. Thiếu cờ xác nhận hoặc URL database thì bộ E2E sẽ dừng trước khi ghi dữ liệu.

Swagger UI: `/api-docs`; OpenAPI JSON: `/api-docs-json`. [Postman collection](backend/postman/Book-Selling-Backend.postman_collection.json) và [quy ước response](backend/docs/API_RESPONSE.md) bổ sung ví dụ. API thành công trả `{ success, data, meta? }`, lỗi trả `{ success: false, error }`. Role, loại notification và các status được khai báo bằng enum trong [Prisma schema](backend/prisma/schema.prisma).

## Trạng thái xác minh

Trên Compose project thử nghiệm riêng, migration 10/10, backend 191/191 unit/API test và 15/15 E2E đã qua; Redis/RabbitMQ/Meilisearch được thử khi gián đoạn. [Báo cáo đối chiếu mới nhất](backend/docs/evidence/rubric-followup-20261020.md) ghi bằng chứng runtime, CI, secret scan và các giới hạn còn lại. Thay đổi sách qua API được giữ trong `BookSearchSync` để tự thử lại khi Meilisearch phục hồi. Nếu index mất dữ liệu hoặc sách được ghi ngoài API, dùng `docker compose --profile tools run --rm search-reindex` để xây dựng lại toàn bộ index. Xem thêm [báo cáo runtime 19/10](backend/docs/evidence/runtime-verification-20261019.md) và [audit gốc](backend/docs/evidence/rubric-audit-20261019.md).

## AI Disclosure

Xem [AI Disclosure](backend/docs/AI_DISCLOSURE.md) về phạm vi AI hỗ trợ và cách xác minh. Nhóm cần review mã và bằng chứng trước khi nộp hoặc triển khai.
