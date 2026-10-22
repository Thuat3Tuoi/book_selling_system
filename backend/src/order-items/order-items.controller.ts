import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { OrderItemsService } from "./order-items.service.js";
import type { OrderItem } from "../generated/prisma/browser.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { StaffAuthGuard } from "../guards/staff-auth.guard.js";
import { ApiBearerAuth, ApiForbiddenResponse } from "@nestjs/swagger";

@UseGuards(JwtAuthGuard, StaffAuthGuard)
@ApiBearerAuth()
@ApiForbiddenResponse({ description: "Requires ADMIN or STAFF" })
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
