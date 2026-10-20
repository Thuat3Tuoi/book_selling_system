import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationType } from "../generated/prisma/enums.js";

describe("NotificationsService", () => {
    let service: NotificationsService;
    const upsert = vi.fn();
    const findUnique = vi.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: PrismaService,
                    useValue: { notification: { upsert, findUnique } },
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("uses the event ID as an idempotency key for cron notifications", async () => {
        const notification = { id: 1 };
        upsert.mockResolvedValue(notification);
        await expect(service.createNotificationOnce("low-stock:2026-10-19:1", {
            notifyType: NotificationType.INFO, userId: 1, message: "low stock",
        })).resolves.toBe(notification);
        expect(upsert).toHaveBeenCalledWith({
            where: { eventId: "low-stock:2026-10-19:1" },
            create: { eventId: "low-stock:2026-10-19:1", notifyType: NotificationType.INFO, userId: 1, message: "low stock" },
            update: {},
        });
    });

    it("accepts concurrent deliveries of the same order event", async () => {
        const existing = { id: 4, eventId: "order.created:2" };
        upsert.mockRejectedValueOnce({ code: "P2002" });
        findUnique.mockResolvedValueOnce(existing);
        await expect(service.createOrderNotification({ id: 2, userId: 1 } as any)).resolves.toBe(existing);
        expect(findUnique).toHaveBeenCalledWith({ where: { eventId: existing.eventId } });
    });
});
