import { Module } from "@nestjs/common";
import { CronJobController } from "./cron-job.controller.js";
import { CronJobService } from "./cron-job.service.js";
import { BooksModule } from "../../books/books.module.js";
import { NotificationsModule } from "../../notifications/notifications.module.js";

@Module({
    imports: [BooksModule, NotificationsModule],
    controllers: [CronJobController],
    providers: [CronJobService],
})
export class CronJobModule {}
