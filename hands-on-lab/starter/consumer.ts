import type { LabContext } from "../types.js";

export async function consumeWithRetryLab(
    context: LabContext,
    queue: string,
    handle: () => Promise<void>,
): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    // TODO 1: gọi handle tối đa 3 lần. Thành công thì ACK đúng 1 lần và return.
    // Giữa các lần thất bại: chờ attempt * 200 ms (200 ms, rồi 400 ms).
    // TODO 2: hết 3 lần lỗi, assertQueue(`${queue}.dead`, { durable: true }).
    // Gửi message.content với persistent: true, đợi callback thành công rồi ACK.
    // TODO 3: tạo/gửi dead queue lỗi thì NACK(message, false, true), không ACK.
    await handle();
    channel.ack(message);
}
