import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service.js";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) {}

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            },
        });

        if (existingUser) {
            throw new ConflictException("Email already exists");
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const customerRole = await this.prisma.role.findUnique({
            where: {
                roleName: "CUSTOMER",
            },
        });

        if (!customerRole) {
            throw new ConflictException("CUSTOMER role not found");
        }

        const user = await this.prisma.user.create({
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                passwordHash,
                phoneNumber: dto.phoneNumber,
                address: dto.address,
                roleId: customerRole.id,
                status: true,
            },
        });

        return {
            message: "Register successfully",
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
            },
        };
    }

    async login(dto: LoginDto, res: Response) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            },
            include: {
                role: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.status) {
            throw new UnauthorizedException("User is inactive");
        }
        // ACCESS TOKEN

      const accessToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                email: user.email,
                role: user.role.roleName,
            },
            {
                expiresIn: "15m",
            }
        );
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
        // COOKIE
        if (res) {
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: refreshTokenTtl,
            });
        }

        return {
            message: "Login successfully",

            accessToken,

            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role.roleName,
            },
        };
    }
}
