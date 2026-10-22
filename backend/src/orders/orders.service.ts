import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { OrderCreaterRequest } from "./dtos/order-creation-request.dto.js";
import { OrderStatus, Prisma, type Order } from "../generated/prisma/client.js";
import type { OrderUpdateRequest } from "./dtos/order-update-request.dto.js";
import type { OrderUpdateStatusRequest } from "./dtos/order-update-status-request.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BooksService } from "../books/books.service.js";
import { RedisService } from "../redis/redis.service.js";
import { canManageCatalog, type AuthenticatedUser } from "../auth/authenticated-user.js";

@Injectable()
export class OrdersService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly bookService: BooksService,
        private readonly redis: RedisService,
    ) {}

    createOrder = async (
        orderCreateRequest: OrderCreaterRequest,
        userId: number,
    ): Promise<Order> => {
        const { orderItems: requestedItems, shippingAddress } = orderCreateRequest;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!requestedItems || requestedItems.length === 0) {
            throw new BadRequestException("Đơn hàng phải có ít nhất một sản phẩm.");
        }

        if (!shippingAddress?.trim() || shippingAddress.trim().length < 10) {
            throw new BadRequestException("Địa chỉ giao hàng phải có ít nhất 10 ký tự.");
        }

        // 2. Kiểm tra số lượng và sản phẩm trùng lặp
        const bookIds = requestedItems.map((item) => item.bookId);

        if (new Set(bookIds).size !== bookIds.length) {
            throw new BadRequestException("Không được thêm cùng một cuốn sách nhiều lần trong đơn hàng.");
        }

        for (const item of requestedItems) {
            if (
                !Number.isInteger(item.bookId) ||
                item.bookId <= 0 ||
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0
            ) {
                throw new BadRequestException("Mã sách và số lượng phải là số nguyên dương.");
            }
        }

        // 3. Tạo đơn hàng, trừ kho và xóa giỏ hàng trong cùng transaction
        const order = await this.prismaService.$transaction(async (tx) => {
            const books = await tx.book.findMany({
                where: {
                    id: { in: bookIds },
                    status: "ACTIVE",
                },
            });

            const bookMap = new Map(books.map((book) => [book.id, book]));

            for (const item of requestedItems) {
                if (!bookMap.has(item.bookId)) {
                    throw new NotFoundException(
                        `Không tìm thấy sách ${item.bookId} hoặc sách không còn hoạt động.`,
                    );
                }
            }

            const orderItems = requestedItems.map((item) => {
                const book = bookMap.get(item.bookId)!;
                const unitPrice = new Prisma.Decimal(book.price);

                return {
                    bookId: book.id,
                    unitPrice,
                    quantity: item.quantity,
                    totalPrice: unitPrice.mul(item.quantity),
                };
            });

            const totalAmount = orderItems.reduce(
                (total, item) => total.plus(item.totalPrice),
                new Prisma.Decimal(0),
            );

            for (const item of orderItems) {
                await this.bookService.reduceBookStock(
                    tx,
                    item.bookId,
                    item.quantity,
                );
            }

            const createdOrder = await tx.order.create({
                data: {
                    userId,
                    shippingAddress: shippingAddress.trim(),
                    totalAmount,
                    status: OrderStatus.PENDING,
                    orderItems: {
                        create: orderItems,
                    },
                },
                include: {
                    orderItems: {
                        include: {
                            book: true,
                        },
                    },
                },
            });

            const cart = await tx.cart.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (cart) {
                await tx.cartItem.deleteMany({
                    where: { cartId: cart.id },
                });
            }

            await tx.outboxEvent.create({
                data: {
                    topic: "order.created",
                    payload: JSON.parse(JSON.stringify(createdOrder)),
                },
            });

            return createdOrder;
        });

        // 4. Transaction thành công: xóa cache
        await this.redis.incrementRevision(`cart:user:${userId}:revision`);
        for (const bookId of bookIds) await this.bookService.invalidateBookCaches(bookId);

        return order;
    };

    getOrderById = async (orderId: number, user: AuthenticatedUser): Promise<Order> => {
        const order = await this.prismaService.order.findFirst({
            where: canManageCatalog(user) ? { id: orderId } : { id: orderId, userId: user.id },
            include: { orderItems: { include: { book: { select: { id: true, title: true } } } } },
        });

        if (!order) {
            throw new NotFoundException("Order not found!");
        }

        return order;
    };

    getOrders = async (user: AuthenticatedUser): Promise<Order[]> => {
        return this.prismaService.order.findMany({
            where: canManageCatalog(user) ? undefined : { userId: user.id },
            include: { orderItems: { include: { book: { select: { id: true, title: true } } } } },
            orderBy: { createdAt: "desc" },
        });
    };

    updateOrder = async (
        orderId: number,
        orderUpdateRequest: OrderUpdateRequest,
        user: AuthenticatedUser
    ): Promise<Order> => {
        const order = await this.getOrderById(orderId, user);
        if (!canManageCatalog(user) && order.status !== OrderStatus.PENDING) {
            throw new ForbiddenException("Only pending orders can be changed");
        }
        return this.updateOrderData(orderId, { shippingAddress: orderUpdateRequest.shippingAddress.trim() });
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
        const exists = await this.prismaService.order.findUnique({ where: { id: orderId } });
        if (!exists) throw new NotFoundException("Order not found!");

        return this.prismaService.order.update({
            where: { id: orderId },
            data,
            include: { orderItems: { include: { book: { select: { id: true, title: true } } } } },
        });
    };
}
