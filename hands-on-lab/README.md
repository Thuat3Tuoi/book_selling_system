# Bài thực hành xử lý message RabbitMQ khi consumer lỗi

**Nhóm 9 · Book Selling System · Công nghệ chính: NestJS · Thời lượng: 40 phút.**

Gói thực hành được bàn giao cùng báo cáo, phục vụ hoạt động thực hành độc lập và chấm chéo giữa các nhóm. Nội dung gồm hoàn thiện hàm `consumeWithRetryLab`, chạy bốn test và phân tích quyết định ACK/NACK. Thư mục `hands-on-lab/` chứa đầy đủ thành phần chạy bài; các liên kết mã nguồn đồ án ở cuối tài liệu phục vụ đối chiếu cơ chế triển khai.

## 1. Cơ sở lựa chọn chủ đề — D0

Khi khách đặt sách, backend ghi đơn và outbox trong cùng transaction PostgreSQL. Publisher gửi `order.created` qua RabbitMQ; consumer tạo thông báo. Nếu ACK trước khi xử lý xong, thông điệp có thể mất khi handler lỗi. Nếu liên tục requeue một event không hợp lệ, consumer có thể lặp vô hạn.

Chủ đề **retry có giới hạn, chuyển message lỗi sang dead queue và ACK/NACK đúng thời điểm** được lựa chọn từ cơ chế xử lý nền của dự án. Nội dung tập trung vào xử lý lỗi và phục hồi thông điệp sau các thao tác nghiệp vụ. Trong [kiểm chứng ngày 20/10/2026](../backend/docs/evidence/advanced-techniques-runtime-2026-10-20.md), event tham chiếu user không tồn tại được chuyển vào `.dead` sau ba lần xử lý; việc gửi lại cùng event chỉ tạo một thông báo.

Bài thực hành sử dụng channel giả lập để kiểm tra quyết định xử lý của consumer trong thời lượng dự kiến 40 phút. Phạm vi unit test gồm luồng điều khiển và thứ tự xác nhận. Độ bền dữ liệu và hành vi khi broker thật mất kết nối thuộc phạm vi kiểm thử tích hợp riêng.

## 2. Mục tiêu học tập

Các mục tiêu của bài thực hành gồm:

1. Viết retry tối đa **ba lần xử lý tổng cộng**, chờ 200 ms rồi 400 ms giữa các lần thất bại.
2. Chỉ ACK khi handler thành công hoặc khi việc chuyển message sang `.dead` đã được xác nhận.
3. Tạo queue với `durable: true`, gửi nội dung gốc với `persistent: true` và chờ callback xác nhận.
4. NACK với `requeue=true` nếu tạo hoặc gửi dead queue thất bại; giải thích vì sao vẫn cần xử lý event trùng.

## 3. Môi trường và công tác chuẩn bị

- Kiến thức đầu vào: TypeScript, `async/await` và cách đọc unit test cơ bản.
- Môi trường chạy: Node.js **22.12 trở lên trong nhánh 22, hoặc 24 trở lên** và npm. Phiên bản dùng để kiểm tra gói thực hành là Node.js 24.
- Công cụ làm bài: trình soạn thảo và bản sao riêng của thư mục thực hành cho từng nhóm.
- Terminal: **Bash trên Linux hoặc Git Bash trên Windows**. Trên Windows, mở thư mục thực hành bằng **Git Bash Here**; trong VS Code, chọn **Terminal → Select Default Profile → Git Bash**, rồi mở terminal mới.
- Cài đặt dependency: kết nối Internet cho lần tải package đầu tiên và thực hiện `npm ci` trước buổi thực hành. Thời gian tải package nằm ngoài thời lượng 40 phút.

Bài thực hành chạy độc lập với Docker, database, broker RabbitMQ và dependency của `backend/`. Tệp `types.ts` mô tả phần giao diện `RmqContext`/ConfirmChannel được sử dụng, cho phép chạy bài độc lập với NestJS.

Trình tự chuẩn bị từ thư mục gốc repository:

```bash
cd hands-on-lab
node --version
npm --version
npm ci
npm test
```

Với gói bàn giao chỉ gồm thư mục thực hành, terminal được mở tại thư mục đó và trình tự bắt đầu từ lệnh `node --version`. Các lệnh npm trong tài liệu được thực hiện tại **`hands-on-lab/`** bằng Bash trên Linux hoặc Git Bash. Dùng `pwd` để xem thư mục hiện tại, `ls` để kiểm tra có `package.json`, và `cd ..` để trở về thư mục cha. Đường dẫn trong Bash dùng dấu `/`; đặt đường dẫn chứa khoảng trắng hoặc ký tự `[`/`]` trong dấu nháy.

**Trạng thái kiểm thử ban đầu: `1 passed`, `3 failed`.** Starter đã xử lý nhánh thành công; ba nhánh lỗi thuộc nội dung bài tập. Ở trạng thái ban đầu, `npm test` trả mã thoát khác 0 do ba test thất bại.

## 4. Cấu trúc gói thực hành

```text
hands-on-lab/
├── README.md                    # Hướng dẫn 40 phút và ba bài tập
├── starter/consumer.ts          # Người học chỉ sửa file này
├── tests/consumer.spec.ts       # Bốn test: một mẫu và ba bài tập
├── types.ts                    # Giao diện context/channel dùng trong lab
├── solution/consumer.ts         # Đáp án chạy được
├── solution/README.md           # Giải thích đáp án và câu hỏi cuối bài
├── submission/MAU_KET_QUA.md     # Mẫu ghi kết quả để chấm chéo
├── package.json
├── package-lock.json            # Khóa phiên bản để cài bằng npm ci
├── tsconfig.json
├── vitest.config.ts             # Test bài làm trong starter/
└── vitest.solution.config.ts    # Cùng bộ test, dùng mã trong solution/
```

Phạm vi chỉnh sửa bài làm là `starter/consumer.ts`. Bộ test, cấu hình test và thư mục `solution/` được giữ nguyên làm cơ sở đối chiếu kết quả.

## 5. Quy trình thực hiện — 40 phút

| Bước | Nội dung | Thời gian |
| --- | --- | --- |
| 1 | Đọc luồng message và chạy starter | 5 phút |
| 2 | Bài tập 1: retry lỗi tạm thời | 10 phút |
| 3 | Bài tập 2: chuyển lỗi lâu dài sang dead queue | 12 phút |
| 4 | Bài tập 3: dead queue cũng lỗi | 8 phút |
| 5 | Giải thích kết quả, lưu minh chứng | 5 phút |
| **Tổng** | | **40 phút** |

### Bước 1 — Đọc luồng và chạy starter (5 phút)

Luồng xử lý trong dự án: **tạo đơn + outbox → publisher → RabbitMQ → consumer → tạo notification → ACK**. Trong NestJS, cấu hình `noAck: false` yêu cầu consumer chủ động xác nhận. Vị trí triển khai gồm [main.ts](../backend/src/main.ts) và [consumer đơn hàng](../backend/src/orders/dtos/consumers/order-created.consumer.ts). Với gói thực hành độc lập, sơ đồ luồng trên và `types.ts` cung cấp thông tin đầu vào cho bài tập.

Hàm trong `starter/consumer.ts` hiện thực hiện `await handle()` rồi ACK. Bước đầu gồm chạy `npm test`, ghi nhận tên ba test thất bại và đối chiếu kết quả mong đợi trong `tests/consumer.spec.ts`.

Hai cơ chế xác nhận được sử dụng gồm `channel.ack(message)` cho message đang nhận và callback của `sendToQueue` trên **ConfirmChannel** cho lượt gửi sang dead queue. Giá trị boolean trả ngay từ `sendToQueue` phản ánh bộ đệm gửi; kết quả xác nhận gửi được nhận qua callback. Bài thực hành giả lập ConfirmChannel. Điều kiện áp dụng với broker thật là channel hỗ trợ publisher confirms, theo [tài liệu amqplib](https://amqp-node.github.io/amqplib/channel_api.html#confirmchannel).

### Bước 2 — Bài tập 1: lỗi tạm thời (10 phút)

**Yêu cầu:** hoàn thiện TODO 1 trong `starter/consumer.ts`.

1. Tạo vòng lặp với `attempt` từ 1 đến 3, gọi `await handle()` trong `try/catch`.
2. Nếu handler lỗi và còn lượt, đợi `attempt * 200` ms trước khi thử tiếp.
3. Khi handler thành công, ACK đúng một lần rồi `return`.
4. Sau ba lần thất bại, thoát vòng lặp để bước tiếp theo xử lý message.

Đoạn mã thực hiện thời gian chờ:

```ts
await new Promise((resolve) => setTimeout(resolve, attempt * 200));
```

Kết quả mong đợi của `npm test` sau bài 1 là **2 test thành công, gồm test starter và bài 1**. Tình huống kiểm thử mô phỏng lỗi lần đầu rồi thành công lần hai; handler được gọi hai lần và message không chuyển sang dead queue.

### Bước 3 — Bài tập 2: lỗi lâu dài (12 phút)

**Yêu cầu:** sau khi dùng hết ba lần xử lý, hoàn thiện TODO 2.

1. Tạo tên queue `${queue}.dead` rồi `await channel.assertQueue(deadQueue, { durable: true })`.
2. Gửi nguyên `message.content` bằng `sendToQueue` với `{ persistent: true }`.
3. Bọc callback trong `Promise<void>`: lỗi thì `reject(error)`, thành công thì `resolve()`.
4. `await` Promise đó; chỉ sau khi callback thành công mới ACK message gốc.

Kết quả mong đợi của `npm test` sau bài 2 là **3 test thành công**. Nội dung kiểm tra gồm handler chạy đúng ba lần và thứ tự **`send → confirm → ack`**. Hàm `channel.sendToQueue(...)` trả boolean; việc dùng `await` trực tiếp trên giá trị này chưa chờ được xác nhận gửi qua callback.

Trong bài này ứng dụng chủ động gửi lại nội dung vào queue `.dead`; chưa cấu hình cơ chế Dead Letter Exchange (DLX) của broker. `durable` và `persistent` cũng không thay thế việc chờ publisher confirm.

### Bước 4 — Bài tập 3: dead queue cũng lỗi (8 phút)

**Yêu cầu:** hoàn thiện TODO 3.

1. Đặt cả `assertQueue` và Promise gửi message vào cùng `try/catch`.
2. Nếu một trong hai thao tác lỗi, gọi `channel.nack(message, false, true)` rồi `return`.
3. Không ACK ở nhánh lỗi. Tham số `false` chỉ tác động message này; `true` yêu cầu đưa lại queue chính.

Kết quả mong đợi của `npm test` sau bài 3 là **`4 passed`**. Test kiểm tra riêng lỗi tạo queue và lỗi callback gửi. Message lỗi nghiệp vụ lâu dài được chuyển vào `.dead`; thao tác requeue áp dụng khi việc chuyển vào `.dead` thất bại.

Giới hạn ba lần áp dụng cho **mỗi lượt nhận**. Nếu dead queue tiếp tục lỗi và message được giao lại, consumer có thể xử lý thêm ở lượt nhận tiếp theo. Tổng số lần xử lý trong toàn bộ vòng đời event có thể vượt quá ba lần.

### Bước 5 — Giải thích và ghi kết quả (5 phút)

Nội dung ghi nhận trong [biểu mẫu kết quả](submission/MAU_KET_QUA.md) gồm kết quả kiểm thử và phần trả lời hai câu hỏi:

1. Nếu ACK trước callback gửi sang dead queue rồi việc gửi thất bại, điều gì có thể xảy ra với message?
2. Nếu đã ghi notification nhưng process chết trước ACK, event có thể được nhận lại không? Vì sao `Notification.eventId` unique và `upsert` trong dự án cần thiết?

[Đáp án và phân tích](solution/README.md) phục vụ đối chiếu sau khi hoàn thành bài làm. Lệnh `npm run test:solution` chạy mã đáp án tham khảo; **minh chứng bài làm trong `starter/` được lấy từ `npm test`**.

## 6. Tình huống lỗi và phương án xử lý

Bảng dưới tổng hợp các tình huống đã ghi nhận trong kiểm thử dự án và các tình huống kiểm tra của starter:

| Hiện tượng | Nguồn ghi nhận / nguyên nhân | Cách kiểm tra và xử lý |
| --- | --- | --- |
| Event `order.created` tham chiếu user không tồn tại, xử lý thất bại liên tiếp | Đã thử trong minh chứng 20/10: dữ liệu không hợp lệ, retry không tự sửa được | Giới hạn ba lần rồi đưa `.dead`; kiểm tra dữ liệu và lỗi trước khi phát lại. |
| Tạo sách khi RabbitMQ dừng, event chưa được gửi | Đã thử trong minh chứng 20/10: broker không sẵn sàng | Outbox giữ event chưa publish và gửi lại khi broker phục hồi; không ACK trước khi chuyển message thành công. Bài lab chỉ kiểm thử nhánh consumer. |
| Gửi lại cùng event có nguy cơ tạo thông báo trùng | Đã thử trong minh chứng 20/10: cùng `order.created` được gửi lại | Mã hiện tại dùng `eventId` unique + `upsert`; kết quả thử chỉ còn một notification. |
| Starter báo `temporary`, `permanent`, `bad event` | Starter chưa triển khai bắt lỗi, tương ứng trạng thái 1 thành công / 3 thất bại | Hoàn thiện TODO 1 → 2 → 3, chạy lại `npm test` sau từng bước. |
| Bài 2 thấy `ack` trước `confirm` | Chỉ `await sendToQueue` hoặc ACK ngay sau khi gọi gửi | Bọc callback vào Promise, đợi Promise thành công mới ACK. |
| Bài 3 throw hoặc vẫn ACK | Callback không `reject`, hoặc ACK nằm sau `catch` không có `return` | Catch lỗi tạo/gửi queue, NACK rồi `return`. |
| Lỗi module hoặc không tìm thấy package | Chưa cài package hoặc terminal đang ở thư mục khác | Mở terminal tại thư mục có `package.json` của lab và chạy `npm ci`. |

Nguồn ghi nhận của ba dòng đầu là [biên bản kiểm chứng của nhóm](../backend/docs/evidence/advanced-techniques-runtime-2026-10-20.md). Các dòng còn lại mô tả tình huống phục vụ bài tập. Phạm vi dữ liệu của bảng gồm môi trường kiểm thử và unit test giả lập.

## 7. Bàn giao và chấm chéo

**Gói bàn giao của nhóm biên soạn:** toàn bộ thư mục thực hành cùng báo cáo, gồm tài liệu, starter, test, đáp án và lockfile; loại trừ `node_modules/`. Starter được bàn giao ở trạng thái chưa giải, tương ứng 1 test thành công và 3 test thất bại.

**Kết quả bàn giao của nhóm thực hành:** `starter/consumer.ts` đã hoàn thiện, ảnh hoặc bản chép kết quả `npm test` báo `4 passed`, thời gian thực hiện và hai câu trả lời cuối bài. Biểu mẫu ghi nhận kết quả được đặt tại `submission/MAU_KET_QUA.md`.

Các nội dung đối chiếu khi chấm chéo:

| Nội dung | Căn cứ đối chiếu |
| --- | --- |
| Cơ sở lựa chọn chủ đề và mục tiêu học tập (D0) | Mục 1 và mục 2. |
| Môi trường và thành phần chuẩn bị | Mục 3 và mục 4. |
| Quy trình và thời lượng thực hiện | Năm bước tại mục 5; khung 30–45 phút, kế hoạch 40 phút. |
| Kết quả ba bài tập | Mã bài làm, kết quả test và đáp án đối chiếu. |
| Phân tích cơ chế xử lý | ACK/NACK, xử lý trùng và giới hạn của unit test. |

Theo yêu cầu đề tài, bài thực hành được chấm riêng theo **D0–D3, tổng 20 điểm**, trong đó **D0 là 5 điểm**. Tên và phân bổ điểm của D1–D3 chưa được xác định trong tài liệu do chưa có mô tả rubric chi tiết. Thời lượng 40 phút là phân bổ dự kiến; thời gian và kết quả thực tế được nhóm chấm chéo ghi nhận sau buổi thực hành.

## 8. Mã nguồn và tài liệu đối chiếu

Các liên kết `../backend/...` tham chiếu mã nguồn trong repository đầy đủ. Gói thực hành độc lập sử dụng các tệp trong `hands-on-lab/` và không phụ thuộc các liên kết này để thực thi.

- [Helper retry trong dự án](../backend/src/infrastructure/rabbitmq/consume-with-retry.ts) và [unit test tương ứng](../backend/src/infrastructure/rabbitmq/consume-with-retry.spec.ts).
- [Consumer đơn hàng](../backend/src/orders/dtos/consumers/order-created.consumer.ts) và [service tạo notification](../backend/src/notifications/notifications.service.ts).
- [Minh chứng runtime 20/10/2026](../backend/docs/evidence/advanced-techniques-runtime-2026-10-20.md).
- [NestJS: RabbitMQ, message acknowledgement](https://docs.nestjs.com/microservices/rabbitmq#message-acknowledgement).
- [RabbitMQ: consumer acknowledgements và publisher confirms](https://www.rabbitmq.com/docs/confirms).
- [amqplib: ConfirmChannel và callback gửi message](https://amqp-node.github.io/amqplib/channel_api.html#confirmchannel).
