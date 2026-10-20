# HANDS-ON LAB — Xử lý message RabbitMQ khi consumer lỗi

**Dự án:** Book Selling System · **Công nghệ chính:** NestJS · **Thời lượng:** 40 phút (trong khung 30–45 phút)  
**Đối tượng:** nhóm đã biết TypeScript, `async/await` và chạy unit test cơ bản.  
**Sản phẩm cuối:** hàm `consumeWithRetryLab` vượt 4 bài kiểm tra; người học giải thích được thời điểm ACK/NACK và giới hạn của cơ chế retry. **Toàn bộ hướng dẫn, mã khởi đầu, test và đáp án nằm trong file này.** Nộp chính file lab này cùng báo cáo; nhóm chấm chéo chỉ cần file này và mã nguồn `backend/` để thực hành.

## 1. Vì sao chọn chủ đề này?

Khi tạo đơn hàng, ứng dụng ghi đơn và bản ghi outbox trong cùng transaction. Publisher chuyển event `order.created` qua RabbitMQ; consumer tạo thông báo. Nếu handler lỗi, ACK sớm sẽ làm mất event. Nếu cứ đưa event lỗi về queue chính, hệ thống có thể lặp vô hạn. Lab cho người học hoàn thiện chính cơ chế mà dự án dùng: **thử lại có giới hạn, đưa message không xử lý được vào queue `.dead`, rồi quyết định ACK/NACK theo kết quả gửi**. Đây là kỹ thuật xử lý nền đã được nhóm triển khai và kiểm thử, vượt thao tác cài đặt hoặc CRUD.

Biên bản kiểm thử tích hợp của nhóm ghi nhận event lỗi vào queue `.dead` sau ba lần xử lý và event trùng chỉ tạo một thông báo; xem phần nguồn mã ở cuối tài liệu.

## 2. Mục tiêu học tập

Sau lab, người học có thể:

1. Giải thích vì sao consumer chỉ ACK **sau khi** xử lý thành công hoặc sau khi đưa message lỗi vào dead queue thành công.
2. Viết vòng retry tối đa ba lần cho lỗi tạm thời, không ACK trong lúc còn thử lại.
3. Tạo dead queue bền vững, gửi lại nội dung message gốc với cờ `persistent`, chờ callback rồi mới ACK.
4. NACK với `requeue=true` khi việc chuyển sang dead queue thất bại; nêu được vì sao phía nhận vẫn cần xử lý trùng event.

## 3. Chuẩn bị trước khi bắt đầu bấm giờ

- Có mã nguồn dự án tại một thư mục riêng hoặc nhánh thực hành; không sửa file `src/infrastructure/rabbitmq/consume-with-retry.ts` của ứng dụng.
- Node.js 22 trở lên, npm và các package của `backend` đã cài bằng `npm ci` trước buổi lab. Không cần Docker, PostgreSQL hay RabbitMQ cho các bài test giả lập channel này.
- Mở terminal trong **`backend/`**. Kiểm tra `node --version` và `npm --version`.
- Trong bản sao hoặc nhánh thực hành, tạo thư mục `backend/labs/rabbitmq-retry/`, rồi chép **một khối mã duy nhất ở Bước 1** vào `consumer.spec.ts`. File này chỉ được tạo trên bản thực hành; repo bàn giao giữ toàn bộ nội dung lab trong tài liệu này.

Chạy lệnh dưới đây từ `backend/` (PowerShell hoặc terminal có Node trong `PATH`):

```bash
npx vitest run labs/rabbitmq-retry/consumer.spec.ts
```

**Kết quả khởi đầu:** 1 test qua, 3 test thất bại. Đây là trạng thái đúng của starter.

## 4. Các bước thực hiện (40 phút)

### Bước 1 — Theo dấu luồng thật và chạy starter (5 phút)

Mở `src/main.ts`: NestJS dùng `noAck: false`, nên consumer phải gọi `ack` hoặc `nack`. Mở `src/orders/dtos/consumers/order-created.consumer.ts`: `@EventPattern("order.created")` chuyển công việc cho helper xử lý retry. Sau đó chạy lệnh test ở mục 3 và ghi lại tên ba bài đang fail.

**Mã khởi đầu và bộ test:** tạo `backend/labs/rabbitmq-retry/consumer.spec.ts` từ toàn bộ khối dưới đây. Chỉ sửa phần `TODO` trong hàm; các test đã có sẵn để người học kiểm tra từng bài.

```ts
import type { RmqContext } from "@nestjs/microservices";

export async function consumeWithRetryLab(
    context: RmqContext,
    queue: string,
    handle: () => Promise<void>,
): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    // TODO 1: thử handle tối đa ba lần; chỉ ACK khi thành công.
    // TODO 2: sau ba lần lỗi, gửi message gốc vào `${queue}.dead`.
    //         Tạo queue durable, gửi persistent và đợi callback thành công trước khi ACK.
    // TODO 3: nếu gửi sang dead queue thất bại, NACK để broker đưa message lại queue chính.
    await handle();
    channel.ack(message);
}

describe("RabbitMQ retry lab", () => {
    const message = { content: Buffer.from('{"id":11}') };
    const order: string[] = [];
    const channel = {
        ack: vi.fn(() => order.push("ack")),
        nack: vi.fn(() => order.push("nack")),
        assertQueue: vi.fn().mockResolvedValue(undefined),
        sendToQueue: vi.fn((_queue: string, _content: Buffer, _options: object, callback: (error: Error | null) => void) => {
            order.push("send");
            callback(null);
        }),
    };
    const context = {
        getChannelRef: () => channel,
        getMessage: () => message,
        getPattern: () => "order.created",
    } as unknown as RmqContext;

    beforeEach(() => {
        vi.clearAllMocks();
        order.length = 0;
        channel.assertQueue.mockResolvedValue(undefined);
        channel.sendToQueue.mockImplementation((_queue, _content, _options, callback) => {
            order.push("send");
            callback(null);
        });
    });

    it("starter: ACK sau khi xử lý thành công", async () => {
        await consumeWithRetryLab(context, "book_queue", vi.fn().mockResolvedValue(undefined));
        expect(channel.ack).toHaveBeenCalledExactlyOnceWith(message);
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it("bài 1: lỗi tạm thời được thử lại rồi chỉ ACK một lần", async () => {
        const handle = vi.fn().mockRejectedValueOnce(new Error("temporary")).mockResolvedValue(undefined);
        await consumeWithRetryLab(context, "book_queue", handle);
        expect(handle).toHaveBeenCalledTimes(2);
        expect(channel.ack).toHaveBeenCalledExactlyOnceWith(message);
        expect(channel.sendToQueue).not.toHaveBeenCalled();
    });

    it("bài 2: lỗi lâu dài vào dead queue trước khi ACK", async () => {
        channel.sendToQueue.mockImplementation((_queue, _content, _options, callback) => {
            order.push("send");
            queueMicrotask(() => {
                order.push("confirm");
                callback(null);
            });
        });
        const handle = vi.fn().mockRejectedValue(new Error("permanent"));
        await consumeWithRetryLab(context, "book_queue", handle);
        expect(handle).toHaveBeenCalledTimes(3);
        expect(channel.assertQueue).toHaveBeenCalledWith("book_queue.dead", { durable: true });
        expect(channel.sendToQueue).toHaveBeenCalledWith(
            "book_queue.dead",
            message.content,
            { persistent: true },
            expect.any(Function),
        );
        expect(order).toEqual(["send", "confirm", "ack"]);
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it("bài 3: lỗi chuyển vào dead queue thì NACK và requeue", async () => {
        channel.sendToQueue.mockImplementation((_queue, _content, _options, callback) => {
            order.push("send");
            callback(new Error("broker unavailable"));
        });
        await consumeWithRetryLab(context, "book_queue", vi.fn().mockRejectedValue(new Error("bad event")));
        expect(channel.ack).not.toHaveBeenCalled();
        expect(channel.nack).toHaveBeenCalledExactlyOnceWith(message, false, true);
        expect(order).toEqual(["send", "nack"]);
    });
});
```

### Bước 2 — Bài tập 1: lỗi tạm thời (10 phút)

Sửa TODO 1: gọi `handle()` tối đa ba lần. Nếu một lần thành công, ACK đúng một lần và `return`. Nếu còn lượt, chờ `attempt * 200` mili giây trước lần tiếp theo. Không để exception thoát ra khi đã dùng hết ba lượt; bước 3 sẽ xử lý message lỗi lâu dài.

Chạy lại test. **Dấu hiệu đúng:** bài “lỗi tạm thời được thử lại rồi chỉ ACK một lần” qua; test starter vẫn qua. Hai bài sau có thể còn fail.

### Bước 3 — Bài tập 2: lỗi lâu dài (12 phút)

Sau vòng retry, gọi `channel.assertQueue(`${queue}.dead`, { durable: true })`. Gửi `message.content` sang queue đó với `{ persistent: true }`. `sendToQueue` nhận callback: bọc callback bằng `Promise`, chỉ `channel.ack(message)` khi callback không báo lỗi. Test kiểm tra thứ tự `send` rồi `ack`.

Chạy lại test. **Dấu hiệu đúng:** bài “lỗi lâu dài vào dead queue trước khi ACK” qua.

### Bước 4 — Bài tập 3: dead queue cũng lỗi (8 phút)

Đặt việc tạo và gửi sang dead queue trong `try/catch`. Khi `assertQueue` hoặc callback gửi báo lỗi, gọi `channel.nack(message, false, true)` để broker đưa message lại queue chính. Không ACK ở nhánh này. Chạy lại test; mục tiêu là **4/4 test qua**.

### Bước 5 — Giải thích kết quả (5 phút)

Trả lời miệng hoặc ghi ngắn: (a) nếu ACK trước callback gửi vào dead queue rồi broker lỗi, message đi đâu? (b) nếu handler đã ghi thông báo nhưng process chết trước ACK, event có thể đến lại không? Trong dự án, `Notification.eventKey` là unique và `createOrderNotification()` dùng `upsert` theo `order.created:<orderId>` để hạn chế thông báo trùng khi event được gửi lại.

**Minh chứng để nhóm khác chấm chéo:** nộp file `consumer.spec.ts` đã hoàn thành, ảnh hoặc bản chép kết quả `4 passed`, và hai câu trả lời ngắn ở trên. Người chấm có thể chạy lại đúng lệnh test tại mục 3; không cần khởi động các dịch vụ của đồ án.

## 5. Đáp án ba bài tập

Thay toàn bộ phần thân hàm trong `consumer.spec.ts` bằng mã sau. Giữ nguyên `import type { RmqContext } ...`, chữ ký hàm và các test đã cấp.

```ts
const channel = context.getChannelRef();
const message = context.getMessage();

for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        await handle();
        channel.ack(message);
        return;
    } catch {
        if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
    }
}

try {
    const deadQueue = `${queue}.dead`;
    await channel.assertQueue(deadQueue, { durable: true });
    await new Promise<void>((resolve, reject) => {
        channel.sendToQueue(deadQueue, message.content,
            { persistent: true }, (error: Error | null) => {
            if (error) reject(error);
            else resolve();
        });
    });
    channel.ack(message);
} catch {
    channel.nack(message, false, true);
}
```

**Bài 1:** `return` sau ACK chặn việc xử lý thêm; lỗi tạm thời làm `handle` chạy hai lần nhưng chỉ một ACK. **Bài 2:** thông điệp lỗi lâu dài được gửi sang queue bền vững trước ACK; nếu ACK trước khi callback báo thành công, có nguy cơ mất message. **Bài 3:** lỗi ở dead queue phải NACK với `requeue=true`, để message còn cơ hội xử lý lại khi broker phục hồi. Đây là cơ chế giao nhận ít nhất một lần, nên consumer không được giả định chỉ nhận mỗi event một lần.

## 6. Lỗi thường gặp và cách kiểm tra

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Starter có `Error: temporary`, `Error: permanent`, `Error: bad event` | Đây là ba lỗi đã thấy khi chạy starter: hàm chưa xử lý nhánh thất bại | Bắt đầu từ Bài 1 rồi chạy lại từng test; trạng thái ban đầu đúng là 1 qua, 3 fail. |
| Bài 1 vẫn fail, chỉ thấy `Error: temporary` | `await handle()` nằm ngoài `try` hoặc chưa có vòng lặp | Đặt lệnh trong `try` của vòng tối đa ba lượt; ACK và `return` khi thành công. |
| Test báo thứ tự `ack` trước `send` | ACK ngay sau `sendToQueue()` mà chưa đợi callback | Bọc callback trong `Promise`, `await` xong mới ACK. |
| Message lỗi bị gửi đi lặp vô hạn | Sau ba lần lỗi vẫn NACK về queue chính, không chuyển `.dead` | Chuyển lỗi nghiệp vụ dai dẳng sang `.dead`; chỉ requeue khi chính thao tác chuyển đó lỗi. |
| Bài 3 vẫn thấy ACK hoặc bị throw | Lỗi callback không đi vào `catch`, hoặc nhánh `catch` vừa ACK vừa NACK | `reject(error)` trong callback, `catch` chỉ gọi `nack(message, false, true)`. |
| Chạy lệnh báo “No test files found” | Terminal chưa ở thư mục `backend/`, hoặc chưa tạo `consumer.spec.ts` | `cd backend`, kiểm tra đường dẫn file, rồi chạy `npx vitest run labs/rabbitmq-retry/consumer.spec.ts`. |

Trong kiểm thử tích hợp của nhóm, event `order.created` tham chiếu user không tồn tại đã vào queue `.dead` sau ba lần xử lý; khi RabbitMQ dừng, outbox giữ event chưa phát hành và phát lại sau khi broker trở lại. Đó là hai tình huống thực tế dùng để thiết kế các nhánh lỗi ở lab. Unit test ở đây chứng minh quyết định ACK/NACK của helper với channel giả; nó không tự chứng minh độ bền lưu trữ của một broker thật.

## 7. Tự kiểm và tài liệu đối chiếu

- [ ] Có thể chỉ vào dòng `noAck: false` và giải thích trách nhiệm ACK/NACK.
- [ ] `npx vitest run labs/rabbitmq-retry/consumer.spec.ts` báo 4/4 test qua sau khi làm bài.
- [ ] Giải thích được thứ tự `handle → ACK`, `3 lỗi → send .dead → ACK`, `send .dead lỗi → NACK/requeue`.
- [ ] Giải thích được vì sao `eventKey` unique vẫn cần cho event nhận lại.

**Theo đề môn học:** tài liệu này là file riêng để nộp và chấm chéo tuần 11. Đề `03_cau_truc_bao_cao.pdf` trong thư mục `Requirements`, tr. 11, nêu D0 (5 điểm) và năm thành phần tối thiểu của lab; việc chấm toàn lab theo D0–D3 là 20 điểm. File rubric chi tiết cho D1–D3 chưa có trong thư mục `Requirements`, nên tài liệu này không tự gán điểm thành phần cho các mục đó.

**Nguồn mã và minh chứng:** `backend/src/infrastructure/rabbitmq/consume-with-retry.ts`, `backend/src/infrastructure/rabbitmq/consume-with-retry.spec.ts`, `backend/src/orders/dtos/consumers/order-created.consumer.ts`, `backend/src/notifications/notifications.service.ts`, `backend/docs/evidence/advanced-techniques-runtime-2026-10-20.md` (đối chiếu ngày 20/10/2026).
