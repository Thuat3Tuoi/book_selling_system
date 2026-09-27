import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { UserService } from "./user.service.js";
import { UserController } from "./user.controller.js";
import { PrismaModule } from "../prisma/prisma.module.js";
 
@Module({
    imports: [PrismaModule, PassportModule],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
 