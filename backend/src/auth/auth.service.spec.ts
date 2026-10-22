import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { UserService } from "../user/user.service.js";

describe("AuthService refresh token rotation", () => {
    const deleteMany = vi.fn();
    const createSession = vi.fn();
    const signAsync = vi.fn().mockResolvedValue("token");
    const findUserByEmail = vi.fn().mockResolvedValue({ id: 3, email: "customer@example.com", roleId: 2, status: true });
    let service: AuthService;

    beforeEach(async () => {
        vi.resetAllMocks();
        signAsync.mockResolvedValue("token");
        findUserByEmail.mockResolvedValue({ id: 3, email: "customer@example.com", roleId: 2, status: true });
        const module = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: { session: { deleteMany, create: createSession } } },
                { provide: JwtService, useValue: { signAsync } },
                { provide: UserService, useValue: { findUserByEmail } },
                { provide: ConfigService, useValue: { get: (key: string) => key === "NODE_ENV" ? "development" : "http://localhost:3000" } },
            ],
        }).compile();
        service = module.get(AuthService);
    });

    it("allows only one refresh when two requests use the same session", async () => {
        const user = { id: 3, email: "customer@example.com" };
        vi.spyOn(service, "verifyRefreshToken").mockResolvedValue(user as any);
        const login = vi.spyOn(service, "login").mockResolvedValue({ accessToken: "next" } as any);
        deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
        const response = {} as any;

        expect(await service.rotateRefreshToken("old", response)).toEqual({ accessToken: "next" });
        expect(await service.rotateRefreshToken("old", response)).toBeNull();
        expect(login).toHaveBeenCalledOnce();
        expect(deleteMany).toHaveBeenCalledWith({ where: { ref: "old", userId: 3 } });
    });

    it("uses a local cookie policy compatible with HTTP development", () => {
        expect(service.refreshCookieOptions()).toEqual(expect.objectContaining({
            httpOnly: true, secure: false, sameSite: "lax", path: "/auth",
        }));
    });

    it("requires an allowed Origin for production cookie authentication", () => {
        const production = new AuthService({} as any, {} as any, {} as any, {
            get: (key: string) => key === "NODE_ENV" ? "production" : "https://shop.example.com",
        } as any);
        const cookieRequest = (origin?: string) => ({
            cookies: { refreshToken: "session" },
            get: () => origin,
        }) as any;
        expect(() => production.assertCookieOrigin(cookieRequest())).toThrow();
        expect(() => production.assertCookieOrigin(cookieRequest("https://attacker.example.com"))).toThrow();
        expect(() => production.assertCookieOrigin(cookieRequest("https://shop.example.com"))).not.toThrow();
    });

    it("issues unique refresh token identifiers for rapid consecutive logins", async () => {
        await service.login({ email: "customer@example.com" });
        await service.login({ email: "customer@example.com" });
        const firstRefresh = signAsync.mock.calls[1][0] as { jti: string };
        const secondRefresh = signAsync.mock.calls[3][0] as { jti: string };
        expect(firstRefresh.jti).toBeTruthy();
        expect(secondRefresh.jti).not.toBe(firstRefresh.jti);
    });
});
