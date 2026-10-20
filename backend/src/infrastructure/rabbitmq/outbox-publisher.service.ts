import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import type { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class OutboxPublisherService {
    private readonly logger = new Logger(OutboxPublisherService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject("RABBITMQ") private readonly rabbitmq: ClientProxy,
    ) {}

    @Cron("*/10 * * * * *", { waitForCompletion: true })
    async publishPending(): Promise<void> {
        const now = new Date();
        const events = await this.prisma.outboxEvent.findMany({
            where: {
                publishedAt: null,
                nextAttemptAt: { lte: now },
                OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
            },
            orderBy: { id: "asc" },
            take: 20,
        });

        for (const event of events) {
            const claimed = await this.prisma.outboxEvent.updateMany({
                where: {
                    id: event.id,
                    publishedAt: null,
                    nextAttemptAt: { lte: now },
                    OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
                },
                data: { lockedUntil: new Date(Date.now() + 60_000) },
            });
            if (claimed.count !== 1) continue;

            try {
                await firstValueFrom(this.rabbitmq.emit(event.topic, event.payload));
                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: { publishedAt: new Date(), lockedUntil: null, lastError: null },
                });
            } catch (error) {
                const reason = error instanceof Error ? error.message : JSON.stringify(error) ?? String(error);
                const attempts = event.attempts + 1;
                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        attempts,
                        lockedUntil: null,
                        nextAttemptAt: new Date(Date.now() + Math.min(300, 2 ** Math.min(attempts, 8)) * 1000),
                        lastError: reason.slice(0, 1000),
                    },
                });
                this.logger.error(`Could not publish outbox event ${event.id}: ${reason}`);
            }
        }
    }
}
