import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { randomUUID } from "node:crypto";
import { BookStatus } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { SearchService } from "./search.service.js";

const LEASE_MS = 300_000;
const RETRY_MAX_MS = 300_000;

@Injectable()
export class BookSearchSyncService {
    private readonly logger = new Logger(BookSearchSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly search: SearchService,
    ) {}

    async enqueue(tx: Prisma.TransactionClient, bookId: number): Promise<void> {
        await tx.bookSearchSync.upsert({
            where: { bookId },
            create: { bookId },
            update: {
                revision: randomUUID(),
                attempts: 0,
                nextAttemptAt: new Date(),
            },
        });
    }

    @Interval(5_000)
    async retryPending(): Promise<void> {
        try {
            const due = await this.prisma.bookSearchSync.findMany({
                where: {
                    nextAttemptAt: { lte: new Date() },
                    OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
                },
                orderBy: { nextAttemptAt: "asc" },
                take: 20,
                select: { bookId: true },
            });
            for (const task of due) await this.syncNow(task.bookId);
        } catch (error) {
            this.logger.error(`Khong the doc hang doi dong bo search: ${(error as Error).message}`);
        }
    }

    async syncNow(bookId: number): Promise<void> {
        const now = new Date();
        const leaseToken = randomUUID();
        const claimed = await this.prisma.bookSearchSync.updateMany({
            where: {
                bookId,
                nextAttemptAt: { lte: now },
                OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
            },
            data: { leaseToken, leaseUntil: new Date(now.getTime() + LEASE_MS) },
        });
        if (claimed.count === 0) return;

        const task = await this.prisma.bookSearchSync.findUnique({ where: { bookId } });
        if (!task || task.leaseToken !== leaseToken) return;

        try {
            const book = await this.prisma.book.findUnique({ where: { id: bookId } });
            if (book?.status === BookStatus.ACTIVE) await this.search.indexBook(book);
            else await this.search.removeBookFromIndex(bookId);

            const deleted = await this.prisma.bookSearchSync.deleteMany({
                where: { bookId, revision: task.revision, leaseToken },
            });
            if (deleted.count === 0) await this.releaseChangedRevision(bookId, leaseToken);
        } catch (error) {
            const attempts = task.attempts + 1;
            const retryMs = Math.min(RETRY_MAX_MS, 5_000 * 2 ** Math.min(attempts - 1, 6));
            const changed = await this.prisma.bookSearchSync.updateMany({
                where: { bookId, revision: task.revision, leaseToken },
                data: {
                    attempts,
                    nextAttemptAt: new Date(Date.now() + retryMs),
                    leaseUntil: null,
                    leaseToken: null,
                },
            });
            if (changed.count === 0) await this.releaseChangedRevision(bookId, leaseToken);
            this.logger.warn(`Dong bo search sach id=${bookId} that bai; retry sau ${retryMs}ms: ${(error as Error).message}`);
        }
    }

    private async releaseChangedRevision(bookId: number, leaseToken: string): Promise<void> {
        await this.prisma.bookSearchSync.updateMany({
            where: { bookId, leaseToken },
            data: { leaseUntil: null, leaseToken: null, nextAttemptAt: new Date() },
        });
    }
}
