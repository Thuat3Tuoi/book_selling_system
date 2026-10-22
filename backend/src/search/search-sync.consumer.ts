import { Controller } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service.js";
import { consumeWithRetry } from "../infrastructure/rabbitmq/consume-with-retry.js";
import { SearchService } from "./search.service.js";

@Controller()
export class SearchSyncConsumer {
    constructor(
        private readonly prisma: PrismaService,
        private readonly search: SearchService,
        private readonly config: ConfigService,
    ) {}

    @EventPattern<string>("book.changed")
    async handle(@Payload() event: { bookId: number }, @Ctx() context: RmqContext): Promise<void> {
        await consumeWithRetry(context, this.config.getOrThrow<string>("RABBITMQ_QUEUE"), async () => {
            const book = await this.prisma.book.findUnique({ where: { id: event.bookId } });
            if (book?.status === "ACTIVE") await this.search.indexBook(book);
            else await this.search.removeBookFromIndex(event.bookId);
        });
    }
}
