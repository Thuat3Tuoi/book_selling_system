import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BooksService } from "../../books/books.service.js";
import { NotificationsService } from "../../notifications/notifications.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { NotificationType, RoleName } from "../../generated/prisma/enums.js";

@Injectable()
export class CronJobService {
    private readonly logger = new Logger(CronJobService.name);

    constructor(
        private bookService: BooksService,
        private notificationsService: NotificationsService,
        private prisma: PrismaService
    ) {}

    // @Cron(CronExpression.EVERY_5_SECONDS)
    @Cron("0 0 8 * * *", { timeZone: "Asia/Ho_Chi_Minh" })
    async sendNotification() {
        this.logger.log("Checking low stock books...");
        // A fresh migrated database has no notification recipient yet.
        const admin = await this.prisma.user.findFirst({
            where: { status: true, role: { roleName: RoleName.ADMIN, status: true } },
            select: { id: true },
            orderBy: { id: "asc" },
        });
        const recipient = admin ?? await this.prisma.user.findFirst({
            where: { status: true, role: { roleName: RoleName.STAFF, status: true } },
            select: { id: true },
            orderBy: { id: "asc" },
        });
        if (!recipient) {
            return;
        }
        const books = await this.bookService.getLowStockBook();

        if (books.length === 0) {
            this.logger.log("No low stock book");
            return;
        }

        const dateParts = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(new Date());
        const dateValue = (part: "year" | "month" | "day") =>
            dateParts.find((item) => item.type === part)?.value;
        const todayInVietnam = `${dateValue("year")}-${dateValue("month")}-${dateValue("day")}`;
        await this.notificationsService.createNotification({
            notifyType: NotificationType.INFO,
            userId: recipient.id,
            message: JSON.stringify(books),
        }, `low-stock:${todayInVietnam}`);
    }
}
