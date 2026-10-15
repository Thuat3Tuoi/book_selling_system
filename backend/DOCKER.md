## Chạy Backend với Docker Compose

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

### 3. Kiểm tra hoạt động

Khi backend đạt trạng thái `healthy`, kiểm tra:

```text
http://localhost:3001/health
```

Endpoint kiểm tra PostgreSQL, Redis và Meilisearch. RabbitMQ được kiểm tra qua container health check và kết nối microservice.

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