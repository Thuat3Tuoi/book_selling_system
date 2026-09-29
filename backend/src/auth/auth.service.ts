import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service.js";

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
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

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
