import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service.js";

import { LoginDto } from "./dto/login.dto.js";
import { CreateUserDto } from "../user/dto/create-user.dto.js";
import { UserService } from "../user/user.service.js";

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly userService: UserService
    ) {}

    async register(dto: CreateUserDto) {
        return this.userService.createUser(dto);
    }

    async login(data: any) {
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
        // // COOKIE
        // if (res) {
        //     res.cookie("refreshToken", refreshToken, {
        //         httpOnly: true,
        //         secure: true,
        //         sameSite: "none",
        //         maxAge: refreshTokenTtl,
        //     });
        // }

        return {
            accessToken,
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
}
