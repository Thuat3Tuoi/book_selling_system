# RabbitMQ: theo dõi sự kiện đơn hàng

Backend gửi sự kiện `order.created` qua RabbitMQ sau khi tạo đơn hàng. Hướng dẫn này dùng Bash (Linux hoặc Git Bash); chạy các lệnh Docker tại **thư mục gốc repository** sau khi đã [khởi động toàn hệ thống](../../../../README.md).

## Kiểm tra broker và queue

```bash
docker compose ps rabbitmq backend
docker compose exec -T rabbitmq rabbitmq-diagnostics -q ping
docker compose exec -T rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
```

Lệnh `ping` phải thành công. Với `RABBITMQ_QUEUE=book_queue` mặc định, ứng dụng dùng:

| Queue | Công dụng |
| --- | --- |
| `book_queue.outbox-v1` | Consumer nhận sự kiện tạo đơn hàng. |
| `book_queue.outbox-v1.dlq` | Giữ message mà consumer từ chối do xử lý lỗi. |

Nếu đổi `RABBITMQ_QUEUE` trong `.env` ở thư mục gốc, thay tiền tố `book_queue` tương ứng. Queue DLQ có thể chỉ xuất hiện sau khi consumer xử lý sự kiện đầu tiên. Compose không mở cổng AMQP hoặc giao diện quản trị RabbitMQ ra máy host.

## Tạo một sự kiện để kiểm tra

Chỉ làm trên database phát triển. Compose ở thư mục gốc đã chạy seed an toàn; mở `http://localhost:3001/api-docs`:

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

`POST /orders` ghi đơn hàng và một bản ghi `OutboxEvent` trong cùng transaction PostgreSQL. Publisher gửi bản ghi đó đến RabbitMQ; consumer tạo notification và xác nhận message. `OutboxEvent.status=PUBLISHED` nghĩa là đã gửi đến broker, không phải bằng chứng notification đã được tạo. Notification có `eventId` duy nhất để tránh tạo trùng khi sự kiện được phát lại.

## Xem outbox khi thông báo chưa xuất hiện

Kiểm tra outbox bằng tài khoản trong `.env` ở thư mục gốc (lệnh dưới dùng giá trị mặc định):

```bash
docker compose exec -T postgres psql -U bookstore -d bookstore <<'SQL'
SELECT id, status, attempts, "nextAttemptAt"
FROM "OutboxEvent"
ORDER BY "createdAt" DESC
LIMIT 10;
SQL
```

Nếu `status=PENDING` và `attempts` tăng, xem log `backend` và trạng thái RabbitMQ. Publisher thử lại theo thời gian chờ tăng dần, tối đa 5 phút. Nếu outbox đã `PUBLISHED` nhưng không có notification, kiểm tra queue `.dlq` và log consumer. Message lỗi ở consumer được đưa sang DLQ; ứng dụng không tự phát lại message trong DLQ.

## Xử lý sự cố

| Hiện tượng | Thực hiện |
| --- | --- |
| Broker không healthy | Chạy `docker compose logs --tail=100 rabbitmq`; kiểm tra `RABBITMQ_USER` và `RABBITMQ_PASSWORD` trong `.env`. |
| Không thấy queue chính | Kiểm tra `backend` đã chạy và `RABBITMQ_QUEUE` có đúng tiền tố dự kiến. |
| Đơn hàng đã tạo nhưng chưa có thông báo | Kiểm tra `OutboxEvent`, đợi lượt gửi kế tiếp, rồi xem log backend và số message trong DLQ. |
| DLQ có message | Xác định lỗi consumer từ log và dữ liệu liên quan trước khi xử lý lại message; không xóa queue để thử lại. |

Mã nguồn: [cấu hình producer](rabbitmq.module.ts), [publisher](../../orders/order-outbox.publisher.ts), [consumer](../../orders/dtos/consumers/order-created.consumer.ts).
