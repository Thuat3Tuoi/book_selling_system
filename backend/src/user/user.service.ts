import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import * as bcrypt from "bcrypt";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}
    async createUser(data: CreateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: data.email,
            },
        });

        if (existingUser) {
            throw new ConflictException("Email already exists");
        }

        const passwordHash = await bcrypt.hash(data.password, 10);
        await this.prisma.user.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                passwordHash: passwordHash,
                phoneNumber: data?.phoneNumber,
                address: data?.address,
                role: { connect: { roleName: "CUSTOMER" } },
            },
        });
        return {
            message: "User created successfully",
        };
    }

    findUserByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: {
                email,
            },
        });
    }

    async findAuthUserById(id: number): Promise<AuthenticatedUser | null> {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                address: true,
                roleId: true,
                status: true,
                role: { select: { roleName: true, status: true } },
            },
        });
        if (!user?.status || !user.role.status) return null;
        const { status: _status, role, ...safeUser } = user;
        return { ...safeUser, role: { roleName: role.roleName } };
    }

    // Thêm mới: dùng cho GET /user/me — trả user theo id, không kèm passwordHash
    async findUserById(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const { passwordHash: _passwordHash, ...safeUser } = user;
        return safeUser;
    }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: email,
            },
        });
        if (!user) {
            return null;
        }
        const status = await bcrypt.compare(password, user.passwordHash);
        if (status) {
            // xóa passwordHash trước khi trả về user
            const { passwordHash: _passwordHash, ...safeUser } = user;
            return safeUser;
        }
        return null;
    }

    async verifyRefreshToken(ref: string, userId: number) {
        const session = await this.prisma.session.findFirst({
            where: {
                ref,
                expires: { gt: new Date() },
                user: {
                    id: userId,
                    status: true,
                },
            },
            include: {
                user: true,
            },
        });

        if (session) {
            return session.user;
        }

        return false;
    }
}
