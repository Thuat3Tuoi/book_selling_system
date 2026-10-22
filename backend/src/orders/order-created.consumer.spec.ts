import { OrderCreatedConsumer } from "./dtos/consumers/order-created.consumer.js";

describe("OrderCreatedConsumer", () => {
    const notificationService = { createOrderNotification: vi.fn() };
    const config = { getOrThrow: () => "book_queue" };
    const channel = { assertQueue: vi.fn(), sendToQueue: vi.fn(), ack: vi.fn(), nack: vi.fn() };
    const message = { content: Buffer.from("event") };
    const context = { getChannelRef: () => channel, getMessage: () => message, getPattern: () => "order.created" };
    const event = { id: "event-1", orderId: 10, userId: 1 };

    beforeEach(() => { vi.resetAllMocks(); });

    it("acknowledges a stored notification", async () => {
        await new OrderCreatedConsumer(notificationService as any, config as any)
            .handle(event, context as any);
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it("dead letters a failed notification without an infinite requeue", async () => {
        notificationService.createOrderNotification.mockRejectedValue(new Error("database down"));
        channel.sendToQueue.mockImplementation((_name, _content, _options, callback) => callback(null));
        await new OrderCreatedConsumer(notificationService as any, config as any)
            .handle(event, context as any);
        expect(channel.assertQueue).toHaveBeenCalledWith("book_queue.dead", { durable: true });
        expect(channel.sendToQueue).toHaveBeenCalledWith("book_queue.dead", message.content, { persistent: true }, expect.any(Function));
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(channel.nack).not.toHaveBeenCalled();
    });
});
