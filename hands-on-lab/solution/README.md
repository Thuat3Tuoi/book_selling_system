# Đáp án và phân tích cơ chế xử lý

[Mã đáp án](consumer.ts) phục vụ đối chiếu sau khi hoàn thành `starter/consumer.ts`. Hai lệnh kiểm thử được thực hiện tại thư mục `hands-on-lab/` bằng **Bash trên Linux hoặc Git Bash trên Windows**:

```bash
npm test
npm run test:solution
```

`npm test` kiểm tra bài làm trong `starter/`; `npm run test:solution` sử dụng cùng bộ test và nạp `solution/consumer.ts`. Kết quả mong đợi của đáp án là **4/4 test thành công**. Starter được bàn giao ở trạng thái **1 test thành công / 3 test thất bại**. Cấu hình kiểm thử đáp án đọc trực tiếp `solution/consumer.ts`, giữ nguyên nội dung starter.

## Bài 1 — Retry lỗi tạm thời

Vòng lặp sử dụng `attempt = 1..3`. Khi handler lỗi và còn lượt, thời gian chờ là `attempt * 200` ms: 200 ms sau lần 1 và 400 ms sau lần 2. Khi handler thành công, consumer ACK rồi `return`, kết thúc xử lý message. Lỗi handler được bắt trong vòng lặp; ACK nằm ngoài khối bắt lỗi handler để lỗi xác nhận không kích hoạt lại nghiệp vụ.

## Bài 2 — Chuyển lỗi lâu dài vào dead queue

Sau ba lần handler thất bại, `assertQueue` tạo `${queue}.dead` với `durable: true`. Consumer gửi nguyên vẹn `message.content` với `persistent: true`. Callback xác nhận của ConfirmChannel được bọc bằng Promise; message gốc được ACK sau khi Promise hoàn tất thành công. Thứ tự mong đợi trong test là **`send → confirm → ack`**.

`sendToQueue()` trả boolean phản ánh bộ đệm gửi; dùng `await` trực tiếp trên giá trị đó chưa chờ được xác nhận của broker. Cơ chế trong bài là gửi chủ động sang dead queue; cấu hình DLX nằm ngoài phạm vi bài thực hành. Điều kiện kết nối RabbitMQ thật là channel hỗ trợ publisher confirms, theo [API ConfirmChannel](https://amqp-node.github.io/amqplib/channel_api.html#confirmchannel).

## Bài 3 — Tạo hoặc gửi dead queue thất bại

Lỗi ở `assertQueue` hoặc callback gửi được xử lý trong `catch`. Consumer gọi `nack(message, false, true)` rồi `return`, kết thúc nhánh lỗi: `false` giới hạn tác động ở message hiện tại, `true` yêu cầu requeue. Test bài 3 bao gồm cả tình huống lỗi tạo queue và lỗi callback gửi.

## Phân tích tình huống cuối bài

**1. Trường hợp ACK trước khi gửi sang dead queue hoàn tất.** Broker có thể bỏ message gốc sau ACK. Nếu gửi sang dead queue thất bại, message gốc đã bị loại khỏi hàng đợi và chưa có bản sao ở dead queue, dẫn đến mất event.

**2. Trường hợp đã ghi notification nhưng tiến trình dừng trước ACK.** Message chưa được xác nhận có thể được giao lại. Cơ chế xử lý trùng trong mã hiện tại gồm ràng buộc unique trên `Notification.eventId` và `createOrderNotification()` dùng `upsert` theo `order.created:<orderId>`, giữ một notification cho cùng event. Phạm vi bảo đảm idempotency là thao tác tạo notification; các tác dụng phụ khác nằm ngoài phạm vi bảo đảm này. Biên bản ngày 20/10 sử dụng tên trường cũ `eventKey`; tên trường trong mã hiện tại là `eventId`.

**Phạm vi kiểm chứng:** ba lần là giới hạn mỗi lượt nhận. Broker có thể giao lại message sau NACK; dead queue hỏng kéo dài có thể dẫn đến nhiều lượt nhận. Unit test giả lập kiểm tra quyết định và thứ tự ACK/NACK. Độ bền dữ liệu trên broker thật thuộc phạm vi kiểm thử tích hợp. Nếu đã publish thành công nhưng tiến trình dừng trước ACK message gốc, dead queue có thể nhận message trùng.
