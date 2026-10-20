import { of, throwError } from "rxjs";
import { OutboxPublisherService } from "./outbox-publisher.service.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import type { ClientProxy } from "@nestjs/microservices";

describe("OutboxPublisherService", () => {
    const event = { id: 3, topic: "order.created", payload: { id: 11 }, attempts: 0 };
    const prisma = {
        outboxEvent: {
            findMany: vi.fn(),
            updateMany: vi.fn(),
            update: vi.fn(),
        },
    };
    const client = { emit: vi.fn() };
    const service = new OutboxPublisherService(prisma as unknown as PrismaService, client as unknown as ClientProxy);

    beforeEach(() => {
        vi.resetAllMocks();
        prisma.outboxEvent.findMany.mockResolvedValue([event]);
        prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    });

    it("marks an event published only after broker confirmation", async () => {
        client.emit.mockReturnValue(of(undefined));
        await service.publishPending();
        expect(client.emit).toHaveBeenCalledWith("order.created", { id: 11 });
        expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
            where: { id: 3 },
            data: expect.objectContaining({ publishedAt: expect.any(Date), lockedUntil: null }),
        });
    });

    it("retains an event with backoff when publish fails", async () => {
        client.emit.mockReturnValue(throwError(() => new Error("broker down")));
        await service.publishPending();
        expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
            where: { id: 3 },
            data: expect.objectContaining({ attempts: 1, nextAttemptAt: expect.any(Date) }),
        });
    });

    it("does not publish an event claimed by another instance", async () => {
        prisma.outboxEvent.updateMany.mockResolvedValue({ count: 0 });
        await service.publishPending();
        expect(client.emit).not.toHaveBeenCalled();
    });
});
