import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import * as bcrypt from "bcrypt";
import { RoleName } from "../generated/prisma/enums.js";
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
        await this.prisma.role.upsert({
            where: { roleName: RoleName.CUSTOMER },
            create: { roleName: RoleName.CUSTOMER },
            update: {},
        });
        await this.prisma.user.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                passwordHash: passwordHash,
                phoneNumber: data?.phoneNumber,
                address: data?.address,
                role: { connect: { roleName: RoleName.CUSTOMER } },
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

    findAuthPrincipalByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, status: true, role: { select: { roleName: true, status: true } } },
        });
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
        if (status && user.status) {
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
                    role: { status: true },
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
