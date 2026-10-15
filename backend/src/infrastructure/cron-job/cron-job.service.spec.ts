import { Test, TestingModule } from "@nestjs/testing";
import { CronJobService } from "./cron-job.service.js";
import { BooksService } from "../../books/books.service.js";
import { NotificationsService } from "../../notifications/notifications.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";

describe("CronJobService", () => {
    let service: CronJobService;
    const createNotification = vi.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CronJobService, 
                { provide: BooksService, useValue: {} },
                { provide: NotificationsService, useValue: { createNotification } },
                { provide: PrismaService, useValue: { user: { findUnique: vi.fn().mockResolvedValue(null) } } },
            ],
        }).compile();

        service = module.get<CronJobService>(CronJobService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("skips notifications when a fresh database has no recipient", async () => {
        await service.sendNotification();
        expect(createNotification).not.toHaveBeenCalled();
    });
});
