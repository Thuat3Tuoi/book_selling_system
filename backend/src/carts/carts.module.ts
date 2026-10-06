import { Module } from "@nestjs/common";
import { CartsController } from "./carts.controller.js";
import { CartsService } from "./carts.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PassportModule } from "@nestjs/passport";

@Module({
    imports: [PrismaModule,PassportModule.register({
                defaultStrategy: "jwt",
            }),],
    controllers: [CartsController],
    providers: [CartsService],
})
export class CartsModule {}
