import { Injectable } from "@nestjs/common";
import type { OrderCreaterRequest } from "./dtos/order-creater-request.dto.js";
import { Prisma, type Order } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class OrdersService {
    constructor(private prismaService: PrismaService) {}

    createOrder = async (orderCreateRequest: OrderCreaterRequest): Promise<Order> => {
        let orderItems = orderCreateRequest.orderItems;

        orderItems.forEach(
            (orderItem) =>
                (orderItem.totalPrice = new Prisma.Decimal(orderItem.unitPrice).mul(
                    orderItem.quantity
                ))
        );

        const totalAmount = orderItems.reduce((total, orderItem) => {
            return total.plus(orderItem.totalPrice);
        }, new Prisma.Decimal(0));

        const order = this.prismaService.order.create({
            data: {
                userId: orderCreateRequest.userId,
                totalAmount,
                shippingAddress: orderCreateRequest.shippingAddress,
                orderItems: {
                    create: orderItems.map((orderItem) => ({
                        bookId: orderItem.bookId,
                        unitPrice: orderItem.unitPrice,
                        quantity: orderItem.quantity,
                        totalPrice: orderItem.totalPrice,
                    })),
                },
            },
        });

        return order;
    };
}
