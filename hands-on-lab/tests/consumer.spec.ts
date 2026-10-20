import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeWithRetryLab } from "lab-consumer";
import type { LabContext, LabConfirmChannel } from "../types.js";

describe("RabbitMQ retry lab", () => {
    const message = { content: Buffer.from('{"id":11}') };
    const order: string[] = [];
    const channel = {
        ack: vi.fn(() => { order.push("ack"); }),
        nack: vi.fn(() => { order.push("nack"); }),
        assertQueue: vi.fn<LabConfirmChannel["assertQueue"]>(),
        sendToQueue: vi.fn<LabConfirmChannel["sendToQueue"]>(),
    };
    const context: LabContext = {
        getChannelRef: () => channel,
        getMessage: () => message,
    };

    beforeEach(() => {
        vi.resetAllMocks();
        order.length = 0;
        channel.assertQueue.mockResolvedValue(undefined);
        channel.sendToQueue.mockImplementation((_queue, _content, _options, callback) => {
            order.push("send");
            callback(null);
            return true;
        });
    });

    it("starter: ACK sau khi xử lý thành công", async () => {
        const handle = vi.fn(async () => {
            await Promise.resolve();
            order.push("handled");
        });
        await consumeWithRetryLab(context, "book_queue", handle);
        expect(handle).toHaveBeenCalledTimes(1);
        expect(order).toEqual(["handled", "ack"]);
        expect(channel.ack).toHaveBeenCalledExactlyOnceWith(message);
        expect(channel.nack).not.toHaveBeenCalled();
        expect(channel.sendToQueue).not.toHaveBeenCalled();
    });

    it("bài 1: lỗi tạm thời được thử lại rồi chỉ ACK một lần", async () => {
        const handle = vi.fn()
            .mockRejectedValueOnce(new Error("temporary"))
            .mockResolvedValue(undefined);
        await consumeWithRetryLab(context, "book_queue", handle);
        expect(handle).toHaveBeenCalledTimes(2);
        expect(channel.ack).toHaveBeenCalledExactlyOnceWith(message);
        expect(channel.nack).not.toHaveBeenCalled();
        expect(channel.sendToQueue).not.toHaveBeenCalled();
    });

    it("bài 2: lỗi lâu dài vào dead queue trước khi ACK", async () => {
        channel.sendToQueue.mockImplementation((_queue, _content, _options, callback) => {
            order.push("send");
            queueMicrotask(() => {
                order.push("confirm");
                callback(null);
            });
            return true;
        });
        const handle = vi.fn().mockRejectedValue(new Error("permanent"));
        await consumeWithRetryLab(context, "book_queue", handle);
        expect(handle).toHaveBeenCalledTimes(3);
        expect(channel.assertQueue).toHaveBeenCalledExactlyOnceWith("book_queue.dead", { durable: true });
        expect(channel.sendToQueue).toHaveBeenCalledExactlyOnceWith(
            "book_queue.dead", message.content, { persistent: true }, expect.any(Function),
        );
        expect(order).toEqual(["send", "confirm", "ack"]);
        expect(channel.ack).toHaveBeenCalledExactlyOnceWith(message);
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it("bài 3: lỗi chuyển vào dead queue thì NACK và requeue", async () => {
        const handle = vi.fn().mockRejectedValue(new Error("bad event"));
        // Kiểm tra cả hai điểm có thể lỗi, trong cùng bài tập số 3.
        for (const failure of ["declare", "publish"]) {
            channel.assertQueue.mockClear();
            channel.ack.mockClear();
            channel.nack.mockClear();
            channel.sendToQueue.mockClear();
            handle.mockClear();
            order.length = 0;
            if (failure === "declare") {
                channel.assertQueue.mockRejectedValueOnce(new Error("queue unavailable"));
            } else {
                channel.sendToQueue.mockImplementation((_queue, _content, _options, callback) => {
                    order.push("send");
                    callback(new Error("broker unavailable"));
                    return true;
                });
            }
            await consumeWithRetryLab(context, "book_queue", handle);
            expect(handle).toHaveBeenCalledTimes(3);
            expect(channel.ack).not.toHaveBeenCalled();
            expect(channel.nack).toHaveBeenCalledExactlyOnceWith(message, false, true);
            expect(order).toEqual(failure === "declare" ? ["nack"] : ["send", "nack"]);
        }
    });
});
