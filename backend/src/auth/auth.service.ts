import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import type { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service.js";

import { CreateUserDto } from "../user/dto/create-user.dto.js";
import { UserService } from "../user/user.service.js";
import { UserResponseDto } from "../user/dto/user-response.dto.js";
import { cookieOptions } from "./refresh-cookie-options.js";
import { allowedOrigins } from "../config/environment.js";

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly config: ConfigService,
    ) {}

    async register(dto: CreateUserDto) {
        return this.userService.createUser(dto);
    }

    async login(data: any, res?: Response) {
        const user = await this.userService.findUserByEmail(data.email);

        if (!user || !user.status) {
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


        res?.cookie("refreshToken", refreshToken, {
            ...this.refreshCookieOptions(),
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            accessToken,
            user: new UserResponseDto(user),
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

    async refreshAccessToken(ref: string) {
        const user = await this.verifyRefreshToken(ref);
        if (!user) throw new UnauthorizedException("Refresh Token is invalid");
        return {
            accessToken: await this.jwtService.signAsync({
                sub: user.id,
                email: user.email,
                role: user.roleId,
            }),
        };
    }

    refreshCookieOptions() {
        return cookieOptions(this.config.get<string>("NODE_ENV"));
    }

    assertCookieOrigin(req: Request): void {
        if (!req.cookies?.refreshToken) return;
        const origin = req.get("Origin");
        const nodeEnv = this.config.get<string>("NODE_ENV");
        const origins = allowedOrigins(this.config.get<string>("CORS_ORIGINS"), nodeEnv);
        if ((nodeEnv === "production" && !origin) || (origin && !origins.includes(origin))) {
            throw new ForbiddenException("Invalid cookie request origin");
        }
    }

    async rotateRefreshToken(ref: string, res: Response) {
        const user = await this.verifyRefreshToken(ref);
        if (!user) return null;
        const deleted = await this.prisma.session.deleteMany({ where: { ref, userId: user.id } });
        if (deleted.count !== 1) return null;
        const result = await this.login(user, res);
        return { accessToken: result.accessToken };
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
