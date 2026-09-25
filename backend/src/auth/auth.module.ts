import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

import { UserModule } from "../user/user.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { LocalStrategy } from "./passport/local.strategy.js";
import { JwtStrategy } from "./passport/jwt.strategy.js";

@Module({
    imports: [
        ConfigModule,
        UserModule,
        PrismaModule,
        PassportModule.register({
            defaultStrategy: "local",
        }),

        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                global: true,
                secret: configService.getOrThrow<string>("JWT_SECRET"),

                signOptions: {
                    expiresIn: "1d",
                },
            }),
        }),
    ],

    controllers: [AuthController],

    providers: [AuthService, LocalStrategy, JwtStrategy],

    exports: [AuthService],
})
export class AuthModule {}
