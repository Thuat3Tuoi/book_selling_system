import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { CookieOptions, Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";

import { CreateUserDto } from "../user/dto/create-user.dto.js";
import { UserService } from "../user/user.service.js";

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) {}

    async register(dto: CreateUserDto) {
        return this.userService.createUser(dto);
    }

    async login(data: any, res?: Response) {
        const user = await this.userService.findUserByEmail(data.email);

        if (!user) {
            throw new UnauthorizedException("Invalid email or password");
        }
        // ACCESS TOKEN

        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            role: user.roleId,
        });
        // REFRESH TOKEN
        const refreshToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                jti: randomUUID(),
            },
            {
                expiresIn: "7d",
            }
        );
        // SESSION
        const refreshTokenTtl = 7 * 24 * 60 * 60 * 1000;

        await this.prisma.session.create({
            data: {
                userId: user.id,
                ref: refreshToken,
                expires: new Date(Date.now() + refreshTokenTtl),
            },
        });


        res?.cookie("refreshToken", refreshToken, this.refreshCookieOptions());

        return {
            accessToken,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phoneNumber,
                address: user.address,
                roleId: user.roleId,
            },
        };
    }

    async verifyRefreshToken(ref: string) {
        try {
            const decode = await this.jwtService.verifyAsync(ref);
            return this.userService.verifyRefreshToken(ref, decode.sub);
        } catch {
            return false;
        }
    }

    async rotateRefreshToken(ref: string, res: Response) {
        const user = await this.verifyRefreshToken(ref);
        if (!user) return null;

        const revoked = await this.prisma.session.deleteMany({
            where: { ref, userId: user.id },
        });
        if (revoked.count !== 1) return null;

        return this.login(user, res);
    }

    refreshCookieOptions(): CookieOptions {
        const production = this.configService.get<string>("NODE_ENV") === "production";
        return {
            httpOnly: true,
            secure: production,
            sameSite: production ? "none" : "lax",
            path: "/auth",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };
    }

    assertCookieOrigin(req: Request): void {
        if (this.configService.get<string>("NODE_ENV") !== "production" || !req.cookies?.refreshToken) return;
        const origin = req.get("origin");
        const allowed = (this.configService.get<string>("CORS_ORIGINS") ?? "")
            .split(",").map((value) => value.trim()).filter(Boolean);
        if (!origin || !allowed.includes(origin)) {
            throw new ForbiddenException("Origin not allowed for cookie authentication");
        }
    }

    async logout(refreshToken: string) {
        await this.prisma.session.deleteMany({
            where: {
                ref: refreshToken,
            },
        });

        return {
            message: "Logout successful",
        };
    }
}
