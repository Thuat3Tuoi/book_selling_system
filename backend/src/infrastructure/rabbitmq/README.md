# RabbitMQ: theo dõi sự kiện đơn hàng

Backend gửi sự kiện `order.created` qua RabbitMQ sau khi tạo đơn hàng. Môi trường thực thi trong tài liệu là Bash trên Linux hoặc Git Bash. Các lệnh Docker được thực hiện tại **thư mục gốc repository**, sau bước [khởi động toàn hệ thống](../../../../README.md).

## 1. Kiểm tra trạng thái broker và queue

Trạng thái broker và số lượng message được kiểm tra bằng các lệnh sau:

```bash
docker compose ps rabbitmq backend
docker compose exec -T rabbitmq rabbitmq-diagnostics -q ping
docker compose exec -T rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
```

Kết quả mong đợi của lệnh `ping` là kết nối thành công. Với cấu hình mặc định `RABBITMQ_QUEUE=book_queue`, ứng dụng sử dụng các queue sau:

| Queue | Công dụng |
| --- | --- |
| `book_queue` | Consumer nhận sự kiện tạo đơn hàng và thay đổi sách. |
| `book_queue.dead` | Giữ message mà consumer không xử lý được sau ba lần thử. |

Tiền tố `book_queue` tương ứng với giá trị `RABBITMQ_QUEUE` trong `.env` tại thư mục gốc. Queue DLQ có thể chỉ xuất hiện sau khi consumer xử lý sự kiện đầu tiên. Compose không mở cổng AMQP hoặc giao diện quản trị RabbitMQ ra máy host.

## 2. Quy trình kiểm tra sự kiện tạo đơn hàng

Môi trường kiểm tra sử dụng database phát triển đã được khởi tạo dữ liệu mẫu bằng Compose tại thư mục gốc. Quy trình thực hiện qua Swagger tại `http://localhost:3001/api/docs` gồm các bước:

1. Gọi `POST /auth/login` bằng tài khoản customer mẫu và lấy access token.
2. Nhấn **Authorize**, nhập token, rồi gọi `GET /books` để lấy ID của sách đang bán.
3. Gọi `POST /orders` với ID vừa lấy. Ví dụ body:

   ```json
   {
     "shippingAddress": "123 Nguyen Hue, Quan 1",
     "orderItems": [{ "bookId": 1, "quantity": 1 }]
   }
   ```

4. Gọi `GET /notifications` bằng cùng tài khoản. Thông báo `ORDER_CREATED` có thể xuất hiện sau vài giây vì publisher kiểm tra outbox mỗi 5 giây.
5. Kiểm tra queue và log:

   ```bash
   docker compose exec -T rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
   docker compose logs --tail=100 backend rabbitmq
   ```

`POST /orders` ghi đơn hàng và một bản ghi `OutboxEvent` trong cùng transaction PostgreSQL. Publisher gửi bản ghi đó đến RabbitMQ; consumer tạo notification và xác nhận message. `OutboxEvent.publishedAt` cho biết broker đã nhận sự kiện; notification có `eventId` duy nhất để tránh tạo trùng khi sự kiện được phát lại.

## 3. Theo dõi trạng thái outbox

Truy vấn outbox sử dụng tài khoản trong `.env` tại thư mục gốc. Lệnh dưới sử dụng giá trị mặc định:

```bash
docker compose exec -T postgres psql -U bookstore -d bookstore <<'SQL'
SELECT id, topic, "publishedAt", attempts, "nextAttemptAt"
FROM "OutboxEvent"
ORDER BY "createdAt" DESC
LIMIT 10;
SQL
```

Trường hợp `publishedAt IS NULL` và `attempts` tăng được đối chiếu với nhật ký `backend` và trạng thái RabbitMQ. Publisher thử lại theo thời gian chờ tăng dần, tối đa 5 phút. Trường hợp đã có `publishedAt` nhưng chưa có notification được kiểm tra qua queue `.dead` và nhật ký consumer. Queue `.dead` lưu message xử lý thất bại ở consumer; việc phát lại các message này thuộc quy trình xử lý của người vận hành.

## 4. Xử lý sự cố

| Hiện tượng | Thực hiện |
| --- | --- |
| Broker không healthy | Chạy `docker compose logs --tail=100 rabbitmq`; kiểm tra `RABBITMQ_USER` và `RABBITMQ_PASSWORD` trong `.env`. |
| Không thấy queue chính | Kiểm tra `backend` đã chạy và `RABBITMQ_QUEUE` có đúng tiền tố dự kiến. |
| Đơn hàng đã tạo nhưng chưa có thông báo | Kiểm tra `OutboxEvent`, đợi lượt gửi kế tiếp, rồi xem log backend và số message trong DLQ. |
| DLQ có message | Xác định lỗi consumer từ log và dữ liệu liên quan trước khi xử lý lại message; không xóa queue để thử lại. |

Mã nguồn: [cấu hình producer](rabbitmq.module.ts), [publisher](outbox-publisher.service.ts), [consumer](../../orders/dtos/consumers/order-created.consumer.ts).
