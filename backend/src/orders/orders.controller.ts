import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse } from "@nestjs/swagger";
import type { Order } from "../generated/prisma/client.js";
import { OrderCreaterRequest } from "./dtos/order-creation-request.dto.js";
import { OrdersService } from "./orders.service.js";
import { OrderUpdateRequest } from "./dtos/order-update-request.dto.js";
import { OrderUpdateStatusRequest } from "./dtos/order-update-status-request.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { StaffAuthGuard } from "../guards/staff-auth.guard.js";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("orders")
export class OrdersController {
    constructor(private readonly orderService: OrdersService) {}

    @Post()
    createOrder(@Req() req: any, @Body() request: OrderCreaterRequest): Promise<Order> {
        const userId = req.user?.id;
        return this.orderService.createOrder(request, userId);
    }

    @Get(":id")
    getOrderById(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
        return this.orderService.getOrderById(id, req.user.id);
    }

    @Get()
    getOrders(@Req() req: any) {
        return this.orderService.getOrders(req.user.id);
    }

    @Patch(":id")
    updateOrder(
        @Req() req: any,
        @Param("id", ParseIntPipe) id: number,
        @Body() orderUpdateRequest: OrderUpdateRequest
    ): Promise<Order> {
        return this.orderService.updateOrder(id, orderUpdateRequest, req.user.id);
    }

    @Patch(":id/status")
    @UseGuards(StaffAuthGuard)
    @ApiForbiddenResponse({ description: "Requires ADMIN or STAFF" })
    updateOrderStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body() orderUpdateStatusRequest: OrderUpdateStatusRequest
    ): Promise<Order> {
        return this.orderService.updateStatusOrder(id, orderUpdateStatusRequest);
    }
}
