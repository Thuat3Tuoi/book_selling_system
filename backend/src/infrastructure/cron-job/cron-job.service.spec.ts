import { Test, TestingModule } from "@nestjs/testing";
import { CronJobService } from "./cron-job.service.js";
import { BooksService } from "../../books/books.service.js";
import { NotificationsService } from "../../notifications/notifications.service.js";

describe("CronJobService", () => {
    let service: CronJobService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CronJobService, 
                { provide: BooksService, useValue: {} },
                { provide: NotificationsService, useValue: {} },
            ],
        }).compile();

        service = module.get<CronJobService>(CronJobService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
