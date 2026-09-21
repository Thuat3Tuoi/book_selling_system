import { Injectable, NotFoundException } from "@nestjs/common";
import type { OrderCreaterRequest } from "./dtos/order-creater-request.dto.js";
import { OrderStatus, Prisma, type Order } from "../generated/prisma/client.js";
import type { OrderUpdateRequest } from "./dtos/order-update-request.dto.js";
import type { OrderUpdateStatusRequest } from "./dtos/order-update-status-request.js";
import { PrismaService } from "../prisma/prisma.service.js";

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

        return this.prismaService.$transaction(async (tx) => {
            // 1. tạo dơn hàng
            const order = tx.order.create({
                data: {
                    userId: orderCreateRequest.userId,
                    totalAmount,
                    shippingAddress: orderCreateRequest.shippingAddress,
                    status: OrderStatus.PENDING,
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

            // 2. Trừ số lượng kho

            return order;
        });
    };

    getOrderById = async (orderId: number): Promise<Order> => {
        const order = await this.prismaService.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            throw new NotFoundException("Order not found!");
        }

        return order;
    };

    getOrders = async (): Promise<Order[]> => {
        return this.prismaService.order.findMany();
    };

    updateOrder = async (
        orderId: number,
        orderUpdateRequest: OrderUpdateRequest
    ): Promise<Order> => {
        return this.updateOrderData(orderId, orderUpdateRequest);
    };

    updateStatusOrder = async (
        orderId: number,
        orderUpdateStatusRequest: OrderUpdateStatusRequest
    ): Promise<Order> => {
        return this.updateOrderData(orderId, orderUpdateStatusRequest);
    };

    private updateOrderData = async (
        orderId: number,
        data: Prisma.OrderUpdateInput
    ): Promise<Order> => {
        // 1. Kiểm tra đơn hàng tồn tại
        await this.getOrderById(orderId);

        // 2. Cập nhật đơn hàng
        return this.prismaService.order.update({
            where: {
                id: orderId,
            },
            data,
        });
    };
}
