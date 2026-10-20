import { consumeWithRetry } from "./consume-with-retry.js";
import type { RmqContext } from "@nestjs/microservices";

describe("consumeWithRetry", () => {
    const message = { content: Buffer.from("event") };
    const channel = { ack: vi.fn(), nack: vi.fn(), assertQueue: vi.fn(), sendToQueue: vi.fn() };
    const context = {
        getChannelRef: () => channel,
        getMessage: () => message,
        getPattern: () => "order.created",
    } as unknown as RmqContext;

    beforeEach(() => {
        vi.resetAllMocks();
        channel.assertQueue.mockResolvedValue(undefined);
        channel.sendToQueue.mockImplementation((_name, _content, _options, callback) => callback(null));
    });

    it("ACKs after the handler succeeds", async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        await consumeWithRetry(context, "orders", handler);
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(channel.sendToQueue).not.toHaveBeenCalled();
    });

    it("retries three times then confirms dead queue publish before ACK", async () => {
        const handler = vi.fn().mockRejectedValue(new Error("permanent"));
        await consumeWithRetry(context, "orders", handler);
        expect(handler).toHaveBeenCalledTimes(3);
        expect(channel.sendToQueue).toHaveBeenCalledWith("orders.dead", message.content, { persistent: true }, expect.any(Function));
        expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it("NACKs for requeue if the dead queue cannot accept the message", async () => {
        channel.assertQueue.mockRejectedValue(new Error("broker down"));
        await consumeWithRetry(context, "orders", vi.fn().mockRejectedValue(new Error("handler failed")));
        expect(channel.ack).not.toHaveBeenCalled();
        expect(channel.nack).toHaveBeenCalledWith(message, false, true);
    });
});
