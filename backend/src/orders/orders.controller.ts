import { Body, Controller, Post } from "@nestjs/common";
import type { Order } from "../generated/prisma/client.js";
import type { OrderCreaterRequest } from "./dtos/order-creater-request.dto.js";
import { OrdersService } from "./orders.service.js";

@Controller("orders")
export class OrdersController {
    constructor(private orderService: OrdersService) {}

    @Post()
    createOrder(@Body() request: OrderCreaterRequest): Promise<Order> {
        return this.orderService.createOrder(request);
    }
}
