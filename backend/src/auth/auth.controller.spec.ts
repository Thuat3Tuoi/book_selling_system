import { Test } from "@nestjs/testing";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { LocalAuthGuard } from "../guards/local-auth.guard.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { ThrottlerModule } from "@nestjs/throttler";

describe("Auth refresh HTTP boundary", () => {
    const rotateRefreshToken = vi.fn();
    const assertCookieOrigin = vi.fn();
    let app: INestApplication;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: { rotateRefreshToken, assertCookieOrigin } }],
        })
            .overrideGuard(LocalAuthGuard).useValue({ canActivate: () => true })
            .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
            .compile();
        app = module.createNestApplication();
        app.use(cookieParser());
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();
    });

    afterAll(async () => { await app?.close(); });
    beforeEach(() => { vi.resetAllMocks(); });

    it("returns 400 for a missing token instead of an internal error", async () => {
        await request(app.getHttpServer()).post("/auth/refresh-token").expect(400);
        expect(rotateRefreshToken).not.toHaveBeenCalled();
    });

    it("accepts the httpOnly cookie without requiring a JSON body", async () => {
        rotateRefreshToken.mockResolvedValue({ accessToken: "next" });
        await request(app.getHttpServer()).post("/auth/refresh-token")
            .set("Cookie", "refreshToken=old")
            .expect(201);
        expect(rotateRefreshToken).toHaveBeenCalledWith("old", expect.anything());
    });
});
