import { ExecutionContext, INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { RolesGuard } from "../guards/roles.guard.js";

describe("Notifications HTTP validation", () => {
    let app: INestApplication;
    const notificationsService = { createNotification: vi.fn().mockResolvedValue({ id: 1 }) };

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [NotificationsController],
            providers: [{ provide: NotificationsService, useValue: notificationsService }, RolesGuard],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate(context: ExecutionContext) {
                context.switchToHttp().getRequest().user = { id: 1, role: { roleName: "STAFF" } };
                return true;
            } })
            .compile();
        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();
    });

    afterAll(async () => app.close());

    it("validates notification fields through the runtime DTO", async () => {
        await request(app.getHttpServer()).post("/notifications")
            .send({ notifyType: "INFO", userId: "1", message: "Hello" }).expect(400);
        await request(app.getHttpServer()).post("/notifications")
            .send({ notifyType: "INFO", userId: 1, message: "Hello" }).expect(201);
        expect(notificationsService.createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ notifyType: "INFO", userId: 1, message: "Hello" }),
        );
    });
});
