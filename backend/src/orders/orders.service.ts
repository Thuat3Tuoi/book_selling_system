import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { OrderCreaterRequest } from "./dtos/order-creation-request.dto.js";
import { OrderStatus, Prisma, type Order } from "../generated/prisma/client.js";
import type { OrderUpdateRequest } from "./dtos/order-update-request.dto.js";
import type { OrderUpdateStatusRequest } from "./dtos/order-update-status-request.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BooksService } from "../books/books.service.js";
import type { ClientProxy } from "@nestjs/microservices";
import { RedisService } from "../redis/redis.service.js";

@Injectable()
export class OrdersService {
    constructor(
        private prismaService: PrismaService,
        private bookService: BooksService,
        private readonly redis: RedisService,
        @Inject("RABBITMQ") private readonly rabbitmq: ClientProxy
    ) {}

 
createOrder = async (
    orderCreateRequest: OrderCreaterRequest,
    userId: number,
): Promise<Order> => {
    const { orderItems: requestedItems, shippingAddress } =
        orderCreateRequest;

    // 1. Kiểm tra dữ liệu đầu vào
    if (!requestedItems || requestedItems.length === 0) {
        throw new BadRequestException(
            "Đơn hàng phải có ít nhất một sản phẩm.",
        );
    }

    if (!shippingAddress?.trim() || shippingAddress.trim().length < 10) {
        throw new BadRequestException(
            "Địa chỉ giao hàng phải có ít nhất 10 ký tự.",
        );
    }

    // 2. Kiểm tra số lượng và sản phẩm trùng lặp
    const bookIds = requestedItems.map((item) => item.bookId);

    if (new Set(bookIds).size !== bookIds.length) {
        throw new BadRequestException(
            "Không được thêm cùng một cuốn sách nhiều lần trong đơn hàng.",
        );
    }

    for (const item of requestedItems) {
        if (
            !Number.isInteger(item.bookId) ||
            item.bookId <= 0 ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        ) {
            throw new BadRequestException(
                "Mã sách và số lượng phải là số nguyên dương.",
            );
        }
    }

    // 3. Tạo đơn hàng, trừ kho và xóa giỏ hàng trong cùng transaction
    const order = await this.prismaService.$transaction(async (tx) => {
        // Lấy sách đang hoạt động
        const books = await tx.book.findMany({
            where: {
                id: { in: bookIds },
                status: "ACTIVE",
            },
        });

        const bookMap = new Map(books.map((book) => [book.id, book]));

        // Kiểm tra tất cả sách tồn tại
        for (const item of requestedItems) {
            if (!bookMap.has(item.bookId)) {
                throw new NotFoundException(
                    `Không tìm thấy sách ${item.bookId} hoặc sách không còn hoạt động.`,
                );
            }
        }

        // Chuẩn bị chi tiết đơn hàng và lấy giá từ database
        const orderItems = requestedItems.map((item) => {
            const book = bookMap.get(item.bookId)!;

            return {
                bookId: book.id,
                unitPrice: book.price,
                quantity: item.quantity,
                totalPrice: book.price.mul(item.quantity),
            };
        });

        // Tính tổng tiền
        const totalAmount = orderItems.reduce(
            (total, item) => total.plus(item.totalPrice),
            new Prisma.Decimal(0),
        );

        // Trừ tồn kho. Hàm này phải kiểm tra tồn kho nguyên tử
        // và ném lỗi nếu không đủ hàng.
        for (const item of orderItems) {
            await this.bookService.reduceBookStock(
                tx,
                item.bookId,
                item.quantity,
            );
        }

        // Tạo đơn hàng và chi tiết đơn hàng
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

        // Tìm giỏ hàng của người dùng
        const cart = await tx.cart.findUnique({
            where: {
                userId,
            },
            select: {
                id: true,
            },
        });

        // Xóa các sản phẩm trong giỏ hàng
        if (cart) {
            await tx.cartItem.deleteMany({
                where: {
                    cartId: cart.id,
                },
            });
        }

        return createdOrder;
    });

    // 4. Transaction đã commit thành công: xóa cache giỏ hàng
    await this.redis.delete(`cart:user:${userId}`);

    // 5. Gửi sự kiện RabbitMQ sau khi transaction commit
    this.rabbitmq.emit("order.created", order).subscribe({
        error: (error) => {
            console.error(
                "Không thể gửi sự kiện order.created:",
                error,
            );
        },
    });

    return order;
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
