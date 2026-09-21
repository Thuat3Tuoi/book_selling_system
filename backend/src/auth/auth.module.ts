import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { PrismaService } from "../prisma/prisma.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";


@Module({
    imports: [
        ConfigModule,

        PassportModule.register({
            defaultStrategy: "jwt",
        }),

        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],

            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>("JWT_SECRET"),

                signOptions: {
                    expiresIn: "1d",
                },
            }),
        }),
    ],

    controllers: [AuthController],

    providers: [AuthService, PrismaService, JwtStrategy],

    exports: [AuthService],
})
export class AuthModule {}
