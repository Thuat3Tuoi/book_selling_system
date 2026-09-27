import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { OrderItemsService } from "./order-items.service.js";
import type { OrderItem } from "../generated/prisma/browser.js";

@Controller("order-items")
export class OrderItemsController {
    constructor(private orderItemsService: OrderItemsService) {}

    @Get()
    getOrderItems(): Promise<OrderItem[]> {
        return this.orderItemsService.getOrderItems();
    }

    @Get(":id")
    getOrderItemById(@Param("id", ParseIntPipe) orderItemId: number): Promise<OrderItem> {
        return this.orderItemsService.getOrderItemsById(orderItemId);
    }
}
