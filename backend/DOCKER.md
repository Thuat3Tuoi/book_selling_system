## Chạy Backend với Docker Compose

Đây là cấu hình **chỉ chạy backend** từ thư mục `backend`. Để khởi động cả frontend và backend bằng một lệnh tại thư mục gốc, xem [README chính](../README.md). Hai cấu hình dùng Compose project và named volumes riêng.

### 1. Cấu hình môi trường

Trong thư mục `backend`, tạo `.env` từ `.env.example` nếu chưa có.

Cấu hình các biến bảo mật:

- `POSTGRES_PASSWORD`
- `RABBITMQ_PASSWORD`
- `MEILISEARCH_API_KEY`
- `JWT_SECRET`

Sử dụng chuỗi ngẫu nhiên đủ dài (ưu tiên hex cho mật khẩu). Nếu `.env` đã tồn tại, chỉ bổ sung biến còn thiếu và **không commit `.env` lên Git**.

Docker Compose tự cấu hình kết nối nội bộ giữa các service. Các cổng dependency không được public ra host.

### 2. Khởi chạy

```bash
cd backend
docker compose config --quiet
docker compose up -d --build
docker compose ps --all
```

Backend mặc định chạy tại `http://localhost:3001`. Có thể thay đổi bằng `BACKEND_PORT` trong `.env`.

Prisma migration được tự động thực thi trước khi backend khởi động.

Nếu cần tài khoản mẫu trên **database phát triển tách biệt**, đặt
`SEED_DEFAULT_PASSWORD` và `SEED_SAMPLE_DATA=YES` trong `.env`, rồi chạy:

```bash
docker compose --profile tools run --rm seed-safe
```

Lệnh này chỉ thêm bản ghi mẫu còn thiếu. Không chạy seed trên database production.

Khi index tìm kiếm bị lệch sau lỗi Meilisearch, chạy `docker compose --profile tools run --rm search-reindex`. Lệnh này **xóa toàn bộ tài liệu trong index sách và tạo lại từ các sách ACTIVE**, nên search có thể tạm thời thiếu kết quả trong lúc rebuild. Không chạy đồng thời với thao tác ghi sách.

Outbox đơn hàng retry khi broker gián đoạn; thông báo dùng `eventId` duy nhất để không tạo trùng khi message được phát lại. Message consumer lỗi chuyển vào queue `.outbox-v1.dlq` để người vận hành kiểm tra. Redis lỗi thì request đọc dùng PostgreSQL; khi Redis trở lại, các key cần invalidation được xóa trước khi dùng cache lại.

### 3. Kiểm tra hoạt động

Khi backend đạt trạng thái `healthy`, kiểm tra:

```text
http://localhost:3001/health
```

Endpoint kiểm tra PostgreSQL, Redis và Meilisearch. RabbitMQ được kiểm tra qua container health check và kết nối microservice.

`npm run test:e2e` cần database thử nghiệm riêng và `E2E_ISOLATED_DB=YES`; file `test/runtime.e2e-spec.ts` còn cần `E2E_BASE_URL` và `E2E_SAMPLE_PASSWORD` để gọi API container. Xem [báo cáo kiểm chứng runtime](docs/evidence/runtime-verification-20261019.md) để biết phạm vi đã chạy.

### 4. Các lệnh thường dùng

```bash
# Xem logs
docker compose logs -f backend

# Kiểm tra trạng thái
docker compose ps --all

# Khởi động lại backend
docker compose restart backend

# Chạy lại migration
docker compose run --rm migrate

# Dừng các service
docker compose stop
```

### 5. Lưu ý về dữ liệu

PostgreSQL, RabbitMQ và Meilisearch sử dụng Docker named volumes để lưu dữ liệu. Redis chỉ dùng làm cache.

**Không chạy `docker compose down -v` nếu muốn giữ dữ liệu.**
