# PostgreSQL: migration và dữ liệu mẫu

PostgreSQL lưu sách, tài khoản, giỏ hàng, đơn hàng, outbox sự kiện và hàng đợi đồng bộ tìm kiếm. Prisma quản lý schema và migration. Hướng dẫn này dùng Bash (Linux hoặc Git Bash); chạy các lệnh Docker tại **thư mục gốc repository** sau khi đã [khởi động toàn hệ thống](../../../README.md).

## Kiểm tra kết nối

```bash
docker compose ps postgres backend
docker compose logs --tail=50 postgres migrate
```

`postgres` phải `healthy` và `migrate` phải hoàn tất với mã thoát 0. Compose kết nối backend đến `postgres:5432`; cổng database không được mở ra máy host.

Để xem dữ liệu bằng psql, dùng `POSTGRES_USER` và `POSTGRES_DB` trong `.env` ở thư mục gốc. Với giá trị mặc định:

```bash
docker compose exec -T postgres psql -U bookstore -d bookstore -c '\dt'
docker compose exec -T postgres psql -U bookstore -d bookstore -c 'SELECT COUNT(*) FROM "Book";'
```

Lệnh đầu liệt kê bảng; lệnh sau đếm số sách. Nếu đã đổi `POSTGRES_USER` hoặc `POSTGRES_DB`, thay hai giá trị `bookstore` tương ứng.

## Chạy migration

Compose tự chạy `prisma migrate deploy` trước khi seed và khởi động backend. Khi cần chạy lại các migration chưa áp dụng:

```bash
docker compose run --rm migrate
```

Trước khi áp dụng migration mới trên database có dữ liệu cần giữ, sao lưu database và xem các file trong [prisma/migrations](../../prisma/migrations). Chạy `npm run prisma:generate` trong `backend` nếu cần tạo lại Prisma Client để phát triển hoặc kiểm thử trên máy host.

## Tạo dữ liệu mẫu

Compose ở thư mục gốc tự chạy seed an toàn bằng `SEED_DEFAULT_PASSWORD` trong file `.env` gốc. Chỉ chạy lại lệnh sau trên database phát triển:

```bash
docker compose run --rm seed-safe
```

Lệnh thêm các bản ghi mẫu còn thiếu; có thể chạy lại mà không xóa dữ liệu đã có. Script `npm run prisma:seed` là seed đặt lại dữ liệu và yêu cầu `SEED_RESET_DATA=YES_I_UNDERSTAND`; chỉ dùng trên database thử nghiệm có thể bỏ toàn bộ dữ liệu.

Sau khi seed riêng mà sách chưa có trong Meilisearch, làm theo [hướng dẫn reindex](../search/README.md).

## Dữ liệu khi dừng Compose

`postgres_data` là Docker named volume. `docker compose stop` hoặc `docker compose down` giữ lại dữ liệu; `docker compose down -v` xóa volume của project và làm mất dữ liệu PostgreSQL. Kiểm tra đúng Compose project trước khi thao tác với volume.

Mã nguồn: [Prisma schema](../../prisma/schema.prisma), [migrations](../../prisma/migrations), [seed an toàn](../../prisma/seed.safe.ts).
