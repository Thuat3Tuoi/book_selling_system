import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BooksService } from "../../books/books.service.js";
import { NotificationsService } from "../../notifications/notifications.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RedisService } from "../../redis/redis.service.js";

@Injectable()
export class CronJobService {
    private readonly logger = new Logger(CronJobService.name);

    constructor(
        private bookService: BooksService,
        private notificationsService: NotificationsService,
        private prisma: PrismaService,
        private redis: RedisService,
    ) {}

    @Cron("0 0 8 * * *", { timeZone: "Asia/Ho_Chi_Minh", waitForCompletion: true })
    async sendNotification() {
        const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        try {
            await this.redis.withLock(`cron:low-stock:${date}`, 3600, async (signal) => {
                const books = await this.bookService.getLowStockBook();
                signal.throwIfAborted();
                if (books.length === 0) {
                    this.logger.log("No low stock books");
                    return;
                }
                const recipients = await this.prisma.user.findMany({
                    where: { status: true, role: { roleName: { in: ["ADMIN", "STAFF"] } } },
                    select: { id: true },
                });
                for (const recipient of recipients) {
                    signal.throwIfAborted();
                    await this.notificationsService.createNotificationOnce(`low-stock:${date}:${recipient.id}`, {
                        notifyType: "INFO",
                        userId: recipient.id,
                        message: JSON.stringify(books.map(({ id, title, stockQuantity }) => ({ id, title, stockQuantity }))),
                    });
                }
                this.logger.log(`Low stock alert: ${books.length} books, ${recipients.length} recipients`);
            });
        } catch (error) {
            this.logger.error(`Low stock task failed: ${(error as Error).message}`);
        }
    }
}
