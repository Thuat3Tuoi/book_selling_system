# Cơ chế cache bằng Redis

Redis lưu bản sao dữ liệu phục vụ cache; PostgreSQL là nguồn dữ liệu chính. Backend xử lý request bằng PostgreSQL khi Redis không sẵn sàng. Endpoint `/health` báo lỗi khi Redis mất kết nối để phản ánh trạng thái dịch vụ cache.

## 1. Phạm vi cache và thời gian lưu

| API | Key cache | TTL |
| --- | --- | --- |
| `GET /books` | `books:page:<page>:limit:<limit>:rev:<version>` | 300 giây |
| `GET /books/:id` | `book:<id>:rev:<version>` | 300 giây |
| `GET /carts` | `cart:user:<userId>:rev:<version>:catalog:<version>` | 300 giây |

## 2. Cập nhật phiên bản và xử lý mất kết nối

Mỗi request đọc phiên bản cache trước khi đọc bản sao. Sau khi tạo, sửa, ngừng bán sách hoặc đặt hàng trừ tồn kho, backend tăng phiên bản sách, danh sách và catalog giỏ hàng **sau khi transaction PostgreSQL hoàn tất**. Thao tác thêm, sửa, xóa mục giỏ hoặc đặt hàng tăng phiên bản giỏ của tài khoản tương ứng. Request đang xử lý có thể ghi cache theo phiên bản cũ; các request mới sử dụng key theo phiên bản mới. Key cũ tự hết hạn sau 300 giây.

Khi Redis kết nối lại, `RedisService` xóa các key cache của ứng dụng trước khi cho phép cache hit. Khi một lệnh Redis thất bại, API đọc dữ liệu từ PostgreSQL. Quy trình kiểm tra sử dụng `--scan` và `TTL`, không sử dụng `FLUSHDB` hoặc `FLUSHALL` để tránh xóa dữ liệu Redis ngoài phạm vi cache đang kiểm tra.

## 3. Quy trình kiểm tra trong Docker Compose

Các lệnh sau kiểm tra kết nối Redis, liệt kê key cache danh sách sách và truy xuất nhật ký backend:

```bash
docker compose exec -T redis redis-cli ping
docker compose exec -T redis redis-cli --scan --pattern 'books:page:*'
docker compose logs --tail=50 backend
```

Nội dung kiểm tra và kết quả mong đợi:

| Thao tác | Kết quả mong đợi |
| --- | --- |
| Gọi `GET /books?page=1&limit=10` hai lần | Nhật ký ghi nhận `CACHE MISS`, sau đó là `CACHE HIT`. |
| Lấy key từ `--scan` và chạy `redis-cli TTL '<key>'` | TTL hợp lệ của bản sao nằm trong khoảng 0–300 giây. |
| Sửa sách rồi đọc lại | Key có `rev` mới; phản hồi chứa dữ liệu PostgreSQL đã cập nhật. |
| Dừng Redis rồi gọi API sách và `/health` | API sách trả dữ liệu từ PostgreSQL; `/health` báo dependency unavailable. |

Mã nguồn: [`redis.service.ts`](redis.service.ts), [`books.service.ts`](../books/books.service.ts), [`carts.service.ts`](../carts/carts.service.ts), [`orders.service.ts`](../orders/orders.service.ts).
