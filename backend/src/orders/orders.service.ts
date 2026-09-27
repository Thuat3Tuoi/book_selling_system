import { Injectable, NotFoundException } from "@nestjs/common";
import type { OrderCreaterRequest } from "./dtos/order-creation-request.dto.js";
import { OrderStatus, Prisma, type Order } from "../generated/prisma/client.js";
import type { OrderUpdateRequest } from "./dtos/order-update-request.dto.js";
import type { OrderUpdateStatusRequest } from "./dtos/order-update-status-request.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BooksService } from "../books/books.service.js";

@Injectable()
export class OrdersService {
    constructor(
        private prismaService: PrismaService,
        private bookService: BooksService
    ) {}

    createOrder = async (orderCreateRequest: OrderCreaterRequest): Promise<Order> => {
        // 1. lấy thông tin sách
        const books = await this.prismaService.book.findMany({
            where: {
                id: {
                    in: orderCreateRequest.orderItems.map((item) => item.bookId),
                },
            },
        });

        // 2. Tạo dữ liệu OrderItem và tính tiền
        const orderItems = orderCreateRequest.orderItems.map((orderItem) => {
            const book = books.find((book) => (book.id === orderItem.bookId));

            if (!book) {
                throw new NotFoundException(`Không tìm thấy sách ${orderItem.bookId}`);
            }

            return {
                bookId: orderItem.bookId,
                unitPrice: book.price,
                quantity: orderItem.quantity,
                totalPrice: book.price.mul(orderItem.quantity),
            };
        });

        // 3. Tính tổng tiền Order
        const totalAmount = orderItems.reduce((total, orderItem) => {
            return total.plus(orderItem.totalPrice);
        }, new Prisma.Decimal(0));

        // 4. Lưu Order và OrderItem và trừ số lượng kho
        return this.prismaService.$transaction(async (tx) => {
            // 1. tạo dơn hàng
            const order = await tx.order.create({
                data: {
                    userId: orderCreateRequest.userId,
                    totalAmount,
                    shippingAddress: orderCreateRequest.shippingAddress,
                    status: OrderStatus.PENDING,
                    orderItems: {
                        create: orderItems,
                    },
                },
                include: {
                    orderItems: true,
                },
            });

            // 2. Trừ số lượng kho
            for (const orderItem of orderItems) {
                await this.bookService.reduceBookStock(tx, orderItem.bookId, orderItem.quantity);
            }

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
