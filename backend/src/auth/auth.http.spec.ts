import { ExecutionContext, INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { LocalAuthGuard } from "../guards/local-auth.guard.js";

describe("Auth HTTP response and refresh validation", () => {
    let app: INestApplication;
    const authService = { refreshAccessToken: vi.fn().mockResolvedValue({ accessToken: "new-access" }) };

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: authService }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate(context: ExecutionContext) {
                context.switchToHttp().getRequest().user = {
                    id: 7, firstName: "A", lastName: "B", email: "a@example.com",
                    phoneNumber: null, address: null, roleId: 2,
                    role: { roleName: "CUSTOMER" }, passwordHash: "must-not-leak",
                };
                return true;
            } })
            .overrideGuard(LocalAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();
        app = module.createNestApplication();
        app.use(cookieParser());
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();
    });

    afterAll(async () => app.close());

    it("uses the refresh cookie and validates an optional request body", async () => {
        await request(app.getHttpServer())
            .post("/auth/refresh-token")
            .set("Cookie", "refreshToken=saved-token")
            .expect(201, { accessToken: "new-access" });
        expect(authService.refreshAccessToken).toHaveBeenCalledWith("saved-token");

        await request(app.getHttpServer())
            .post("/auth/refresh-token")
            .send({ refreshToken: 123 })
            .expect(400);
    });

    it("returns a public profile without passwordHash", async () => {
        const response = await request(app.getHttpServer()).get("/auth/profile").expect(200);
        expect(response.body).toEqual({
            id: 7, firstName: "A", lastName: "B", email: "a@example.com",
            phone: null, address: null, roleId: 2,
        });
    });
});
