import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

describe("NotificationsController", () => {
    let controller: NotificationsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationsController],
            providers: [
                {
                    provide: NotificationsService,
                    useValue: {},
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<NotificationsController>(NotificationsController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
