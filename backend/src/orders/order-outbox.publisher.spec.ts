import { of, throwError } from "rxjs";
import { OrderOutboxPublisher } from "./order-outbox.publisher.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { OutboxEventType, OutboxStatus } from "../generated/prisma/enums.js";
import { OrderEventPattern } from "./order-event-pattern.enum.js";

describe("order event delivery", () => {
    const event = {
        id: "event-1", eventType: OutboxEventType.ORDER_CREATED, payload: { orderId: 10, userId: 1 },
        status: OutboxStatus.PENDING, attempts: 0, createdAt: new Date(), nextAttemptAt: new Date(0),
    };
    const prisma = {
        outboxEvent: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
        notification: { create: vi.fn() },
    };
    const rabbitmq = { emit: vi.fn() };

    beforeEach(() => {
        vi.resetAllMocks();
        prisma.outboxEvent.findMany.mockResolvedValue([event]);
        prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    });

    it("keeps the event pending when the broker is interrupted", async () => {
        rabbitmq.emit.mockReturnValue(throwError(() => new Error("broker down")));
        await new OrderOutboxPublisher(prisma as any, rabbitmq as any).publishPending();
        expect(prisma.outboxEvent.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: OutboxStatus.PENDING, attempts: 1 }),
        }));
    });

    it("continues retrying after five failed attempts instead of losing the notification", async () => {
        prisma.outboxEvent.findMany.mockResolvedValue([{ ...event, attempts: 4 }]);
        rabbitmq.emit.mockReturnValue(throwError(() => new Error("broker down")));
        await new OrderOutboxPublisher(prisma as any, rabbitmq as any).publishPending();
        expect(prisma.outboxEvent.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: OutboxStatus.PENDING, attempts: 5 }),
        }));
    });

    it("publishes a claimed event and marks it published", async () => {
        rabbitmq.emit.mockReturnValue(of(true));
        await new OrderOutboxPublisher(prisma as any, rabbitmq as any).publishPending();
        expect(rabbitmq.emit).toHaveBeenCalledWith(OrderEventPattern.CREATED, { id: "event-1", orderId: 10, userId: 1 });
        expect(prisma.outboxEvent.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: OutboxStatus.PUBLISHED }),
        }));
    });

    it("accepts duplicate deliveries while storing one notification", async () => {
        const service = new NotificationsService(prisma as any);
        const stored = new Set<string>();
        prisma.notification.create.mockImplementation(({ data }: { data: { eventId: string } }) => {
            if (stored.has(data.eventId)) throw { code: "P2002" };
            stored.add(data.eventId);
            return { id: 1 };
        });
        await service.createOrderNotification({ eventId: "event-1", orderId: 10, userId: 1 });
        await service.createOrderNotification({ eventId: "event-1", orderId: 10, userId: 1 });
        expect(prisma.notification.create).toHaveBeenCalledTimes(2);
        expect(stored.size).toBe(1);
        expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventId: "event-1" }) });
    });
});
