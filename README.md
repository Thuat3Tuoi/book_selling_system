# Book Selling System

Hệ thống bán sách gồm REST API NestJS 12 và giao diện Next.js 16. Backend dùng Prisma/PostgreSQL, Redis, RabbitMQ và Meilisearch. Docker Compose chạy backend cùng các dịch vụ phụ thuộc; frontend chạy riêng.

## Bắt đầu

Yêu cầu Node.js 22, npm và Docker Desktop. Trong `backend`, sao chép `.env.example` thành `.env` rồi điền `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD`, `MEILISEARCH_API_KEY` và `JWT_SECRET`. Không commit `.env`.

```bash
cd backend
npm ci
npm run prisma:generate
docker compose config --quiet
docker compose up -d --build
docker compose ps --all
```

Compose khởi động PostgreSQL, Redis, RabbitMQ, Meilisearch, chạy Prisma migration rồi mới khởi động API. Mặc định API ở `http://localhost:3001`, health check ở `/health`; có thể đổi cổng bằng `BACKEND_PORT`. Swagger UI ở `/api-docs`, OpenAPI JSON ở `/api-docs-json`. Xem [hướng dẫn Docker](backend/DOCKER.md) nếu cần xem log, kiểm tra trạng thái hoặc khôi phục chỉ mục tìm kiếm.

Để chạy giao diện, sao chép `frontend/.env.example` thành `frontend/.env`, đặt `NEXT_PUBLIC_API_URL=http://localhost:3001`, rồi chạy:

```bash
cd frontend
npm ci
npm run dev
```

Giao diện mặc định ở `http://localhost:3000`. Backend dùng `CORS_ORIGINS` (các origin cách nhau bằng dấu phẩy; mặc định `http://localhost:3000`).

## Dữ liệu mẫu và migration

Trên **database phát triển tách biệt**, đặt `SEED_DEFAULT_PASSWORD` và `SEED_SAMPLE_DATA=YES` trong `backend/.env`, rồi chạy từ `backend`:

```bash
docker compose --profile tools run --rm seed-safe
```

Seed an toàn chỉ thêm role, hai customer, một staff và một sách còn thiếu. Tài khoản mẫu là `customer-a@bookstore.example.com`, `customer-b@bookstore.example.com` và `staff@bookstore.example.com`; mật khẩu là giá trị bạn đặt trong `SEED_DEFAULT_PASSWORD`. Với PostgreSQL chạy riêng, đặt `DATABASE_URL` rồi dùng `npm run prisma:seed:safe`. Script cũ `npm run prisma:seed` **xóa và tạo lại dữ liệu** và yêu cầu `SEED_RESET_DATA=YES_I_UNDERSTAND`; chỉ dùng trên database thử nghiệm có thể bỏ dữ liệu.

Migration mới nhất `20261020000000_book_search_sync` đã được chạy trên database audit cô lập, **chưa chạy trên database mặc định của người dùng**. Trước khi triển khai bản mới trên database đang có dữ liệu, sao lưu và xem các migration; Compose sẽ chạy `prisma migrate deploy` khi khởi động.

## Kiểm thử

```bash
cd backend
npm run lint
npm run build
npm test
npx prisma validate

cd ../frontend
npm run build
```

`npm run test:e2e` ghi dữ liệu nên chỉ chạy với database thử nghiệm riêng. Bộ test yêu cầu `E2E_ISOLATED_DB=YES` và `DATABASE_URL` của database đó; các ca khởi tạo ứng dụng còn cần `JWT_SECRET`, `RABBITMQ_URL`, `RABBITMQ_QUEUE` cùng biến kết nối Redis/Meilisearch trỏ đến dịch vụ thử nghiệm. Luồng mua hàng qua container cần thêm `E2E_BASE_URL` và `E2E_SAMPLE_PASSWORD` trùng mật khẩu seed. Thiếu cờ xác nhận hoặc URL database, test dừng trước khi ghi dữ liệu. Xem [phạm vi kiểm thử runtime](backend/docs/evidence/runtime-verification-20261019.md). CI trong [workflow](.github/workflows/backend-ci.yml) chạy backend lint/build/unit test và frontend build khi push hoặc mở PR; E2E chạy riêng trên môi trường audit.

## API và vận hành

API thành công trả `{ success, data, meta? }`; lỗi trả `{ success: false, error }`. Xem [quy ước response](backend/docs/API_RESPONSE.md) và [Postman collection](backend/postman/Book-Selling-Backend.postman_collection.json). Role, loại thông báo và các trạng thái nghiệp vụ được khai báo bằng enum trong [Prisma schema](backend/prisma/schema.prisma).

Cache Redis có TTL 300 giây và được vô hiệu hóa sau thay đổi sách/giỏ. Đơn hàng dùng outbox PostgreSQL, consumer idempotency và dead-letter queue để xử lý lại lỗi RabbitMQ. Thay đổi sách qua API được ghi trong `BookSearchSync` để thử đồng bộ lại khi Meilisearch phục hồi. Nếu toàn bộ index bị mất hoặc sách được sửa ngoài API, chạy `docker compose --profile tools run --rm search-reindex` trong `backend` để tạo lại index từ sách đang bán; xem [hướng dẫn Docker](backend/DOCKER.md) trước khi chạy.

## Trạng thái đối chiếu ngày 20/10/2026

Mã ở SHA `bb7593c` trên nhánh `audit/rubric-completion-20261019` đã qua backend lint/build, **191/191 unit/API test**, **15/15 E2E** trên Compose/database cô lập, và frontend build qua TypeScript. Migration **10/10** chạy trên database audit. Các phép thử broker, cache, search gián đoạn và phục hồi cùng kết quả EXPLAIN được ghi trong [báo cáo đối chiếu](backend/docs/evidence/rubric-followup-20261020.md).

Checklist hiện **22/23 tiêu chí đạt**. D1 Git workflow còn đạt một phần: [PR #12](https://github.com/Thuat3Tuoi/book_selling_system/pull/12) vẫn là Draft, chưa có review chéo và chưa merge vào `main`. [Báo cáo Word cập nhật 20/10](backend/REPORT_CCNLTHD_NHOM_9_CAP_NHAT_20261020.docx) giải thích thay đổi so với bản báo cáo 16/10. Không có file nhận xét tuần 5 của nhóm 9 trong bộ tài liệu chuẩn; đây là đánh giá bản hiện tại, không gán trạng thái đã sửa góp ý cũ.

## AI Disclosure

Xem [AI Disclosure](backend/docs/AI_DISCLOSURE.md) về phạm vi AI hỗ trợ và cách xác minh. Nhóm cần tự review mã, migration và bằng chứng trước khi nộp hoặc triển khai.
