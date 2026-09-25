import { Module } from "@nestjs/common";
import { CartsController } from "./carts.controller.js";
import { CartsService } from "./carts.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
    imports: [PrismaModule],
    controllers: [CartsController],
    providers: [CartsService],
})
export class CartsModule {}
