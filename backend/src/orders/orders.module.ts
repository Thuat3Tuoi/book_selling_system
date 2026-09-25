import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { BooksModule } from "../books/books.module.js";

@Module({
    imports: [BooksModule],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule {}
