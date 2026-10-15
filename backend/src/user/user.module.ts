import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { UserService } from "./user.service.js";
import { UserController } from "./user.controller.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

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
