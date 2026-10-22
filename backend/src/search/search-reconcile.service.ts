import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { SearchService } from "./search.service.js";

@Injectable()
export class SearchReconcileService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SearchReconcileService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly search: SearchService,
    ) {}

    onApplicationBootstrap(): void {
        void this.reconcile();
    }

    @Cron("0 */15 * * * *", { waitForCompletion: true })
    async reconcile(): Promise<void> {
        try {
            await this.redis.withLock("search:reindex", 900, async (signal) => {
                const books = await this.prisma.book.findMany({ where: { status: "ACTIVE" } });
                signal.throwIfAborted();
                await this.search.reindexAll(books, signal);
                this.logger.log(`Reconciled ${books.length} active books with Meilisearch`);
            });
        } catch (error) {
            this.logger.error(`Search reconciliation failed: ${(error as Error).message}`);
        }
    }
}
