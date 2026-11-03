# Triển khai backend bằng Docker Compose

Tệp `backend/docker-compose.yml` triển khai API và các dịch vụ phụ thuộc. Cấu hình sử dụng Compose project và volume riêng so với [cấu hình toàn hệ thống ở thư mục gốc](../README.md). Thư mục thực thi các lệnh Docker trong tài liệu là **`backend/`**.

## 1. Cấu hình môi trường và khởi động

Tệp `.env` được tạo từ `.env.example`, gồm các biến `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD`, `MEILISEARCH_API_KEY` và `JWT_SECRET` có độ dài tối thiểu 32 ký tự. Biến `SEED_DEFAULT_PASSWORD` được cấu hình khi sử dụng dữ liệu mẫu. Mật khẩu PostgreSQL và RabbitMQ sử dụng chuỗi an toàn trong URL. Tệp `.env` chứa thông tin bí mật và được loại khỏi nội dung commit.

Trình tự khởi động từ thư mục gốc repository:

```bash
cd backend
cp .env.example .env
# Điền các giá trị bí mật trong .env
docker compose config --quiet
docker compose up --build -d
docker compose ps --all
```

Compose áp dụng migration rồi chạy service `seed`. `seed.ts` **bổ sung các bản ghi mẫu còn thiếu** khi `DEMO_SEED_ENABLED=true` và `NODE_ENV=development` hoặc `test`; bước seed được bỏ qua khi `DEMO_SEED_ENABLED=false`. Phạm vi sử dụng seed là database phát triển và kiểm thử. Các tài khoản mẫu gồm `admin@bookstore.example.com`, `staff@bookstore.example.com` và khách hàng; mật khẩu khởi tạo được lấy từ `SEED_DEFAULT_PASSWORD`. Mật khẩu của tài khoản đã tồn tại được giữ nguyên.

## 2. Dịch vụ và đồng bộ tìm kiếm

Backend mặc định ở `http://localhost:3001`; Swagger ở `/api/docs` và OpenAPI JSON ở `/api/docs-json`. `GET /health` kiểm tra PostgreSQL, Redis và Meilisearch. RabbitMQ được Compose health check và kết nối microservice kiểm tra khi khởi động. Các cổng PostgreSQL, Redis, RabbitMQ và Meilisearch không mở ra host.

Lệnh đối soát chỉ mục Meilisearch sau khi bổ sung dữ liệu bằng seed:

```bash
docker compose exec -T backend node dist/search/reindex.script.js
```

Backend cũng tự đối soát index khi khởi động và mỗi 15 phút. Tạo/sửa/ngừng bán sách qua API ghi yêu cầu đồng bộ bền vững trong PostgreSQL; worker thử lại khi Meilisearch hồi phục.

## 3. Điều kiện kiểm thử E2E

Môi trường E2E sử dụng **database và dịch vụ cô lập** cùng biến `E2E_ISOLATED_DB=YES`. Sau khi build, migrate và seed database thử, `npm run test:runtime` tự khởi động API trên cổng trống, chạy đầy đủ E2E và các kiểm tra RabbitMQ/EXPLAIN, rồi dừng API đó. Biến kết nối phải truy cập được từ tiến trình chạy test; Compose mặc định không mở cổng dữ liệu ra host. Hướng dẫn và danh sách biến nằm trong [README gốc](../README.md#4-quy-trình-kiểm-thử).

Nếu kiểm thử một API có sẵn bằng `npm run test:e2e`, đặt thêm `E2E_BASE_URL`, `E2E_SAMPLE_PASSWORD` (hoặc `SEED_DEFAULT_PASSWORD`) và `E2E_ALLOWED_ORIGIN`; origin phải thuộc `CORS_ORIGINS` của API. Suite HTTP bị bỏ qua khi thiếu `E2E_BASE_URL`. Xem [hướng dẫn kiểm thử](docs/TESTING.md) để chọn lệnh và cấu hình phù hợp.

## 4. Nhật ký vận hành và dừng hệ thống

```bash
docker compose logs --tail=100 migrate seed backend
docker compose ps --all
docker compose down
```

`docker compose down` giữ dữ liệu trong named volumes. `docker compose down -v` xóa các volume PostgreSQL, RabbitMQ và Meilisearch của **Compose project đang chọn**.
