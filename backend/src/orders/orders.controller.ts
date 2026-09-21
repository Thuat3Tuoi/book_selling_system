import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import type { Order } from "../generated/prisma/client.js";
import type { OrderCreaterRequest } from "./dtos/order-creater-request.dto.js";
import { OrdersService } from "./orders.service.js";
import type { OrderUpdateRequest } from "./dtos/order-update-request.dto.js";
import type { OrderUpdateStatusRequest } from "./dtos/order-update-status-request.js";

@Controller("orders")
export class OrdersController {
    constructor(private orderService: OrdersService) {}

    @Post()
    createOrder(@Body() request: OrderCreaterRequest): Promise<Order> {
        return this.orderService.createOrder(request);
    }

    @Get(":id")
    getOrderById(@Param("id", ParseIntPipe) id: number) {
        return this.orderService.getOrderById(id);
    }

    @Get()
    getOrders() {
        return this.orderService.getOrders();
    }

    @Patch(":id")
    updateOrder(
        @Param("id", ParseIntPipe) id: number,
        @Body() orderUpdateRequest: OrderUpdateRequest
    ): Promise<Order> {
        return this.orderService.updateOrder(id, orderUpdateRequest);
    }

    @Patch(":id/status")
    updateOrderStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body() orderUpdateStatusRequest: OrderUpdateStatusRequest
    ): Promise<Order> {
        return this.orderService.updateStatusOrder(id, orderUpdateStatusRequest);
    }
}
