import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { UserService } from "./user.service.js";
import { UserController } from "./user.controller.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
 
// @Module({
//     imports: [PrismaModule, PassportModule],
//     controllers: [UserController],
//     providers: [UserService],
//     exports: [UserService],
// })
@Module({
    imports: [
        PassportModule.register({
            defaultStrategy: "jwt",
        }),
    ],
    controllers: [UserController],
    providers: [UserService, JwtAuthGuard],
    exports: [UserService],
})
export class UserModule {}
 