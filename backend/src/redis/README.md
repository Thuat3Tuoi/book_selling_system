# Redis: kiểm tra và sử dụng cache

Redis lưu bản sao tạm thời của sách và giỏ hàng. PostgreSQL là nơi lưu dữ liệu gốc. Hướng dẫn này dùng Bash (Linux hoặc Git Bash); chạy các lệnh Docker tại **thư mục gốc repository** sau khi đã [khởi động toàn hệ thống](../../../README.md).

## Kiểm tra Redis

```bash
docker compose ps redis backend
docker compose exec -T redis redis-cli PING
```

`PING` phải trả `PONG`. Compose kết nối backend đến `redis:6379`; cổng Redis không được mở ra máy host.

## Thử cache của danh sách sách

Gọi cùng URL hai lần:

```bash
curl -fsS 'http://localhost:3001/books?page=1&limit=10'
curl -fsS 'http://localhost:3001/books?page=1&limit=10'
docker compose logs --tail=30 backend
docker compose exec -T redis redis-cli TTL books:page:1:limit:10
```

Log backend ghi `CACHE MISS` khi đọc PostgreSQL và `CACHE HIT` khi đọc lại từ Redis. Nếu key đã tồn tại trước lần gọi đầu tiên, cả hai lần có thể là `CACHE HIT`. `TTL` trả số giây còn lại (tối đa 300); `-2` nghĩa là key không tồn tại hoặc đã hết hạn. Có thể xem giá trị JSON:

```bash
docker compose exec -T redis redis-cli GET books:page:1:limit:10
```

Để thử lại từ `CACHE MISS`, chỉ xóa key của trang đang kiểm tra rồi gọi lại URL:

```bash
docker compose exec -T redis redis-cli DEL books:page:1:limit:10
curl -fsS 'http://localhost:3001/books?page=1&limit=10'
```

`DEL` ở đây chỉ xóa bản sao cache, không xóa sách trong PostgreSQL.

## Các key ứng dụng sử dụng

| API | Key | TTL |
| --- | --- | --- |
| `GET /books?page=<page>&limit=<limit>` | `books:page:<page>:limit:<limit>` | 300 giây |
| `GET /books/:id` | `book:<id>` | 300 giây |
| `GET /carts` (cần đăng nhập) | `cart:user:<userId>` | 300 giây |

Muốn kiểm tra cache chi tiết sách, chọn ID của một sách đang bán rồi gọi `GET /books/<id>` hai lần. Sau đó chạy `docker compose exec -T redis redis-cli TTL book:<id>` với ID thực tế.

Khi tạo, sửa hoặc ngừng bán sách, backend xóa cache danh sách liên quan; khi sửa hoặc ngừng bán, backend cũng xóa cache chi tiết sách và giỏ hàng. Thao tác giỏ hàng xóa cache giỏ của người dùng đó. Đặt hàng xóa cache giỏ, danh sách và sách có tồn kho thay đổi. Redis gián đoạn thì thao tác đọc lấy dữ liệu từ PostgreSQL; backend thử xóa các key đang chờ khi kết nối lại.

## Xử lý sự cố

| Hiện tượng | Thực hiện |
| --- | --- |
| Không nhận `PONG` | Chạy `docker compose ps --all` và `docker compose logs --tail=100 redis`. |
| Không thấy `CACHE HIT` | Gọi lại đúng URL và tham số trước khi TTL hết; xem `docker compose logs --tail=100 backend`. |
| `/health` trả lỗi dù Redis có `PONG` | Kiểm tra thêm PostgreSQL và Meilisearch theo [hướng dẫn Compose](../../../README.md). |
| Dữ liệu cache không đúng sau khi sửa PostgreSQL trực tiếp | Xóa key cụ thể bằng `redis-cli DEL` hoặc cập nhật qua API để backend tự vô hiệu hóa cache. |

Mã nguồn: [RedisService](redis.service.ts), [BooksService](../books/books.service.ts), [CartsService](../carts/carts.service.ts).
