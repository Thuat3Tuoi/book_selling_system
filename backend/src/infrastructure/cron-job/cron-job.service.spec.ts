import { Test, TestingModule } from "@nestjs/testing";
import { CronJobService } from "./cron-job.service.js";
import { BooksService } from "../../books/books.service.js";
import { NotificationsService } from "../../notifications/notifications.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RoleName } from "../../generated/prisma/enums.js";

describe("CronJobService", () => {
    let service: CronJobService;
    const createNotification = vi.fn();
    const getLowStockBook = vi.fn();
    const findRecipient = vi.fn();

    beforeEach(async () => {
        vi.resetAllMocks();
        findRecipient.mockResolvedValue(null);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CronJobService, 
                { provide: BooksService, useValue: { getLowStockBook } },
                { provide: NotificationsService, useValue: { createNotification } },
                { provide: PrismaService, useValue: { user: { findFirst: findRecipient } } },
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

    it("does not create empty notifications when no books are low on stock", async () => {
        findRecipient.mockResolvedValue({ id: 1 });
        getLowStockBook.mockResolvedValue([]);
        await service.sendNotification();
        expect(createNotification).not.toHaveBeenCalled();
    });

    it("sends inventory alerts to staff when there is no admin account", async () => {
        findRecipient.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 9 });
        getLowStockBook.mockResolvedValue([{ id: 3, stockQuantity: 2 }]);
        await service.sendNotification();
        expect(findRecipient).toHaveBeenNthCalledWith(2, expect.objectContaining({
            where: expect.objectContaining({ role: { roleName: RoleName.STAFF, status: true } }),
        }));
        expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 9 }), expect.any(String));
    });

    it("sends one deterministic event id per Vietnam calendar day for database deduplication", async () => {
        findRecipient.mockResolvedValue({ id: 7 });
        getLowStockBook.mockResolvedValue([{ id: 3, stockQuantity: 2 }]);
        await service.sendNotification();
        expect(createNotification).toHaveBeenCalledOnce();
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 7 }),
            expect.stringMatching(/^low-stock:\d{4}-\d{2}-\d{2}$/),
        );
    });
});
