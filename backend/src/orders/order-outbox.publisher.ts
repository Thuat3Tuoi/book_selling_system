import { Inject, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import type { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom, timeout } from "rxjs";
import { PrismaService } from "../prisma/prisma.service.js";
import { OutboxEventType, OutboxStatus } from "../generated/prisma/enums.js";
import { OrderEventPattern } from "./order-event-pattern.enum.js";

const patternByType: Record<OutboxEventType, OrderEventPattern> = {
    [OutboxEventType.ORDER_CREATED]: OrderEventPattern.CREATED,
};

@Injectable()
export class OrderOutboxPublisher {
    private readonly logger = new Logger(OrderOutboxPublisher.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject("RABBITMQ") private readonly rabbitmq: ClientProxy,
    ) {}

    @Interval(5000)
    async publishPending(): Promise<void> {
        const now = new Date();
        const events = await this.prisma.outboxEvent.findMany({
            where: {
                nextAttemptAt: { lte: now },
                status: { in: [OutboxStatus.PENDING, OutboxStatus.PROCESSING, OutboxStatus.DEAD] },
            },
            take: 20,
            orderBy: { createdAt: "asc" },
        });

        for (const event of events) {
            const claim = await this.prisma.outboxEvent.updateMany({
                where: { id: event.id, status: event.status, nextAttemptAt: { lte: now } },
                data: { status: OutboxStatus.PROCESSING, nextAttemptAt: new Date(Date.now() + 30_000) },
            });
            if (claim.count === 0) continue;

            try {
                await firstValueFrom(this.rabbitmq.emit(patternByType[event.eventType], {
                    id: event.id,
                    ...event.payload as object,
                }).pipe(timeout(5000)));
                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: { status: OutboxStatus.PUBLISHED, publishedAt: new Date() },
                });
            } catch (error) {
                const attempts = event.attempts + 1;
                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        status: OutboxStatus.PENDING,
                        attempts,
                        nextAttemptAt: new Date(Date.now() + Math.min(300_000, 2 ** Math.min(attempts, 8) * 1000)),
                    },
                });
                this.logger.error(`Outbox ${event.id} failed (attempt ${attempts}; will retry): ${String(error)}`);
            }
        }
    }
}
