import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { OrderItemsService } from "./order-items.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { RolesGuard } from "../guards/roles.guard.js";
import { Roles } from "../guards/roles.decorator.js";
import { OrderItemResponseDto } from "./dtos/order-item-response.dto.js";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "STAFF")
@Controller("order-items")
export class OrderItemsController {
    constructor(private orderItemsService: OrderItemsService) {}

    @Get()
    async getOrderItems(): Promise<OrderItemResponseDto[]> {
        const items = await this.orderItemsService.getOrderItems();
        return items.map((item) => new OrderItemResponseDto(item));
    }

    @Get(":id")
    async getOrderItemById(@Param("id", ParseIntPipe) orderItemId: number): Promise<OrderItemResponseDto> {
        return new OrderItemResponseDto(await this.orderItemsService.getOrderItemsById(orderItemId));
    }
}
