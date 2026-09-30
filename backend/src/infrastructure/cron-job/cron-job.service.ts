import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BooksService } from "../../books/books.service.js";
import { NotificationsService } from "../../notifications/notifications.service.js";

@Injectable()
export class CronJobService {
    private readonly logger = new Logger(CronJobService.name);

    constructor(
        private bookService: BooksService,
        private notificationsService: NotificationsService
    ) {}

    // @Cron("* * 8 * * *")
    @Cron(CronExpression.EVERY_5_SECONDS)
    async sendNotification() {
        this.logger.log("Checking low stock books...");
        const books = await this.bookService.getLowStockBook();

        if (books.length === 0) {
            console.log("No low stock book");
            await this.notificationsService.createNotification({
                notifyType: "INFO",
                userId: 1,
                message: "No low stock book",
            });
        }

        // business logic
        console.log("Has low stock books...");
        await this.notificationsService.createNotification({
            notifyType: "INFO",
            userId: 1,
            message: JSON.stringify(books),
        });
    }
}
