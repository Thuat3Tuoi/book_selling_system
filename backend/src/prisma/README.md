# PostgreSQL: migration và dữ liệu mẫu

PostgreSQL lưu sách, tài khoản, giỏ hàng, đơn hàng, outbox sự kiện và hàng đợi đồng bộ tìm kiếm. Prisma quản lý schema và migration. Môi trường thực thi trong tài liệu là Bash trên Linux hoặc Git Bash. Các lệnh Docker được thực hiện tại **thư mục gốc repository**, sau bước [khởi động toàn hệ thống](../../../README.md).

## 1. Kết nối và truy xuất dữ liệu

Trạng thái kết nối được kiểm tra qua các service `postgres`, `backend` và nhật ký migration:

```bash
docker compose ps postgres backend
docker compose logs --tail=50 postgres migrate
```

Điều kiện hoàn tất khởi tạo là service `postgres` ở trạng thái `healthy` và service `migrate` kết thúc với mã thoát 0. Compose kết nối backend đến `postgres:5432`; cổng database không được mở ra máy host.

Truy xuất dữ liệu bằng psql sử dụng `POSTGRES_USER` và `POSTGRES_DB` trong `.env` tại thư mục gốc. Các lệnh với giá trị mặc định:

```bash
docker compose exec -T postgres psql -U bookstore -d bookstore -c '\dt'
docker compose exec -T postgres psql -U bookstore -d bookstore -c 'SELECT COUNT(*) FROM "Book";'
```

Lệnh đầu liệt kê các bảng; lệnh sau đếm số sách. Hai tham số `bookstore` tương ứng với giá trị của `POSTGRES_USER` và `POSTGRES_DB` trong cấu hình.

## 2. Quy trình áp dụng migration

Compose tự chạy `prisma migrate deploy` trước khi seed và khởi động backend. Lệnh áp dụng các migration còn lại:

```bash
docker compose run --rm migrate
```

Quy trình áp dụng migration mới trên database có dữ liệu gồm bước sao lưu và kiểm tra nội dung SQL trong [prisma/migrations](../../prisma/migrations) trước khi thực thi. Prisma Client phục vụ phát triển hoặc kiểm thử trên máy host được tạo lại bằng `npm run prisma:generate` tại `backend/`.

## 3. Khởi tạo dữ liệu mẫu

Compose tại thư mục gốc tự chạy seed an toàn với mật khẩu được lấy từ `SEED_DEFAULT_PASSWORD` trong tệp `.env` gốc. Lệnh chạy lại seed trên database phát triển:

```bash
docker compose run --rm seed-safe
```

Lệnh bổ sung các bản ghi mẫu còn thiếu và giữ nguyên dữ liệu đã có khi thực thi lại. Script `npm run prisma:seed` khởi tạo bộ dữ liệu demo có số lượng lớn hơn, với điều kiện `DEMO_SEED_ENABLED=true` và `NODE_ENV=development` hoặc `test`. Script sử dụng upsert/create và giữ nguyên dữ liệu cũ. Phạm vi sử dụng là database phát triển và kiểm thử.

Quy trình đồng bộ chỉ mục sau khi seed riêng được trình bày trong [tài liệu Meilisearch](../search/README.md).

## 4. Lưu trữ dữ liệu khi dừng Compose

`postgres_data` là Docker named volume. Lệnh `docker compose stop` hoặc `docker compose down` giữ lại dữ liệu; `docker compose down -v` xóa volume của project và làm mất dữ liệu PostgreSQL. Xác định Compose project đang chọn là bước kiểm tra trước khi thao tác với volume.

Mã nguồn: [Prisma schema](../../prisma/schema.prisma), [migrations](../../prisma/migrations), [seed an toàn](../../prisma/seed.safe.ts).
