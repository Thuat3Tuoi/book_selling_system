import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationType } from "../generated/prisma/enums.js";

describe("NotificationsService", () => {
    let service: NotificationsService;
    const create = vi.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: PrismaService,
                    useValue: { notification: { create } },
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("treats a duplicate cron event as already delivered", async () => {
        create.mockRejectedValueOnce({ code: "P2002" });
        const result = await service.createNotification({ notifyType: NotificationType.INFO, userId: 1, message: "low stock" }, "low-stock:2026-10-19");
        expect(result).toBeNull();
        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ eventId: "low-stock:2026-10-19" }),
        }));
    });
});
