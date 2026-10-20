import { Test, TestingModule } from "@nestjs/testing";
import { CronJobService } from "./cron-job.service.js";
import { BooksService } from "../../books/books.service.js";
import { NotificationsService } from "../../notifications/notifications.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RedisService } from "../../redis/redis.service.js";

describe("CronJobService", () => {
    let service: CronJobService;
    const createNotificationOnce = vi.fn();
    const getLowStockBook = vi.fn();
    const findMany = vi.fn();
    const withLock = vi.fn(async (_key: string, _ttl: number, task: () => Promise<void>) => { await task(); return true; });

    beforeEach(async () => {
        vi.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CronJobService, 
                { provide: BooksService, useValue: { getLowStockBook } },
                { provide: NotificationsService, useValue: { createNotificationOnce } },
                { provide: PrismaService, useValue: { user: { findMany } } },
                { provide: RedisService, useValue: { withLock } },
            ],
        }).compile();

        service = module.get<CronJobService>(CronJobService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("skips notifications when no low-stock book exists", async () => {
        getLowStockBook.mockResolvedValue([]);
        await service.sendNotification();
        expect(createNotificationOnce).not.toHaveBeenCalled();
    });

    it("notifies active staff once per day using an event key", async () => {
        getLowStockBook.mockResolvedValue([{ id: 2, title: "Book", stockQuantity: 3 }]);
        findMany.mockResolvedValue([{ id: 4 }]);
        await service.sendNotification();
        expect(createNotificationOnce).toHaveBeenCalledWith(expect.stringMatching(/^low-stock:.*:4$/), expect.objectContaining({ userId: 4 }));
    });
});
