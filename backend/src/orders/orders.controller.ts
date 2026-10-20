import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { OrderCreaterRequest } from "./dtos/order-creation-request.dto.js";
import { OrdersService } from "./orders.service.js";
import { OrderUpdateRequest } from "./dtos/order-update-request.dto.js";
import { OrderUpdateStatusRequest } from "./dtos/order-update-status-request.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { RolesGuard } from "../guards/roles.guard.js";
import { Roles } from "../guards/roles.decorator.js";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { OrderResponseDto } from "./dtos/order-response.dto.js";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ApiEnvelopeResponse } from "../common/api-envelope.decorator.js";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags("Orders")
@Controller("orders")
export class OrdersController {
    constructor(private readonly orderService: OrdersService) {}

    @Post()
    @ApiOperation({ summary: "Create an order for the authenticated customer" })
    @ApiEnvelopeResponse(201, OrderResponseDto)
    async createOrder(@Req() req: any, @Body() request: OrderCreaterRequest): Promise<OrderResponseDto> {
        const userId = req.user?.id;
        return new OrderResponseDto(await this.orderService.createOrder(request, userId));
    }

    @Get(":id")
    @ApiParam({ name: "id", type: Number })
    @ApiOperation({ summary: "Read own order; ADMIN and STAFF can read any order" })
    @ApiEnvelopeResponse(200, OrderResponseDto)
    async getOrderById(@Param("id", ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
        return new OrderResponseDto(await this.orderService.getOrderById(id, req.user));
    }

    @Get()
    @ApiOperation({ summary: "List own orders; ADMIN and STAFF see all orders" })
    @ApiEnvelopeResponse(200, OrderResponseDto, { array: true })
    async getOrders(@Req() req: { user: AuthenticatedUser }) {
        const orders = await this.orderService.getOrders(req.user);
        return orders.map((order) => new OrderResponseDto(order));
    }

    @Patch(":id")
    @ApiParam({ name: "id", type: Number })
    @ApiEnvelopeResponse(200, OrderResponseDto)
    async updateOrder(
        @Param("id", ParseIntPipe) id: number,
        @Body() orderUpdateRequest: OrderUpdateRequest,
        @Req() req: { user: AuthenticatedUser }
    ): Promise<OrderResponseDto> {
        return new OrderResponseDto(await this.orderService.updateOrder(id, orderUpdateRequest, req.user));
    }

    @Patch(":id/status")
    @UseGuards(RolesGuard)
    @Roles("ADMIN", "STAFF")
    @ApiParam({ name: "id", type: Number })
    @ApiEnvelopeResponse(200, OrderResponseDto)
    async updateOrderStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body() orderUpdateStatusRequest: OrderUpdateStatusRequest
    ): Promise<OrderResponseDto> {
        return new OrderResponseDto(await this.orderService.updateStatusOrder(id, orderUpdateStatusRequest));
    }
}
