# Redis cache

Redis chỉ giữ bản sao dữ liệu; PostgreSQL là nguồn dữ liệu chính. Backend vẫn xử lý request bằng PostgreSQL khi Redis không sẵn sàng. `/health` báo lỗi khi Redis mất kết nối để hệ thống giám sát biết cache đang hỏng.

| API | Key cache | TTL |
| --- | --- | --- |
| `GET /books` | `books:page:<page>:limit:<limit>:rev:<version>` | 300 giây |
| `GET /books/:id` | `book:<id>:rev:<version>` | 300 giây |
| `GET /carts` | `cart:user:<userId>:rev:<version>:catalog:<version>` | 300 giây |

Mỗi request đọc phiên bản cache trước khi đọc bản sao. Sau khi tạo/sửa/ngừng bán sách hoặc đặt hàng trừ tồn kho, backend tăng phiên bản sách, danh sách và catalog giỏ hàng **sau khi transaction PostgreSQL hoàn tất**. Thêm/sửa/xóa mục giỏ hoặc đặt hàng tăng phiên bản giỏ của user đó. Request cũ có thể ghi cache với phiên bản cũ, nhưng các request mới sẽ không đọc key cũ. Key cũ tự hết hạn sau 300 giây.

Khi Redis kết nối lại, `RedisService` xóa các key cache của ứng dụng trước khi cho phép cache hit. Nếu một lệnh Redis lỗi, API đọc PostgreSQL. Không dùng `FLUSHDB` hoặc `FLUSHALL` để kiểm tra cache.

## Kiểm tra trong Docker Compose

```bash
docker compose exec -T redis redis-cli ping
docker compose exec -T redis redis-cli --scan --pattern 'books:page:*'
docker compose logs --tail=50 backend
```

Gọi `GET /books?page=1&limit=10` hai lần; log phải có `CACHE MISS` rồi `CACHE HIT`. Lấy key được liệt kê bằng `--scan` và xem TTL bằng `redis-cli TTL '<key>'`; giá trị hợp lệ của bản sao là 0–300 giây. Sau thao tác sửa sách, lần đọc kế tiếp phải dùng key có `rev` mới và trả dữ liệu PostgreSQL mới. Khi Redis dừng, API sách vẫn trả dữ liệu còn `/health` báo dependency unavailable.

Mã nguồn: [`redis.service.ts`](redis.service.ts), [`books.service.ts`](../books/books.service.ts), [`carts.service.ts`](../carts/carts.service.ts), [`orders.service.ts`](../orders/orders.service.ts).
