import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "./orders.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BooksService } from "../books/books.service.js";
import { RedisService } from "../redis/redis.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { OutboxEventType } from "../generated/prisma/enums.js";

vi.mock("../generated/prisma/client.js", () => ({
    PrismaClient: class {},
    OrderStatus: {
        PENDING: "PENDING",
        PROCESSING: "PROCESSING",
        COMPLETED: "COMPLETED",
        CANCELLED: "CANCELLED",
    },
    Prisma: {
        Decimal: class Decimal {
            constructor(public value: any) {}
            mul(val: any) {
                return new Decimal(Number(this.value) * Number(val));
            }
            plus(val: any) {
                return new Decimal(Number(this.value) + Number(val?.value ?? val));
            }
        },
    },
}));

const USER_ID = 7;
const ORDER_ID = 100;

const makeBook = (overrides = {}) => ({
    id: 1,
    title: "Clean Code",
    price: 150000,
    stockQuantity: 10,
    status: "ACTIVE",
    ...overrides,
});

const makeOrder = (overrides = {}) => ({
    id: ORDER_ID,
    userId: USER_ID,
    totalAmount: new Prisma.Decimal(300000),
    status: "PENDING",
    shippingAddress: "123 Le Loi, Quan 1, TP.HCM",
    orderItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("OrdersService", () => {
    let service: OrdersService;

    const prisma = {
        $transaction: vi.fn(),
        book: { findMany: vi.fn() },
        order: {
            create: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        outboxEvent: { create: vi.fn() },
        cart: { findUnique: vi.fn() },
        cartItem: { deleteMany: vi.fn() },
    };

    const booksService = {
        reduceBookStock: vi.fn(),
    };

    const redis = {
        delete: vi.fn(),
        deleteMany: vi.fn(),
        deleteByPattern: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: PrismaService, useValue: prisma },
                { provide: BooksService, useValue: booksService },
                { provide: RedisService, useValue: redis },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("createOrder", () => {
        const validRequest = {
            shippingAddress: "123 Le Loi, Quan 1, TP.HCM",
            orderItems: [{ bookId: 1, quantity: 2 }],
        };

        it("tạo đơn hàng thành công, trừ tồn kho, xóa giỏ hàng và bắn event RabbitMQ", async () => {
            const activeBook = makeBook();
            const createdOrder = makeOrder();

            prisma.book.findMany.mockResolvedValue([activeBook]);
            booksService.reduceBookStock.mockResolvedValue(undefined);
            prisma.order.create.mockResolvedValue(createdOrder);
            prisma.cart.findUnique.mockResolvedValue({ id: 50 });
            prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });

            const result = await service.createOrder(validRequest, USER_ID);

            expect(prisma.book.findMany).toHaveBeenCalledWith({
                where: { id: { in: [1] }, status: "ACTIVE" },
            });
            expect(booksService.reduceBookStock).toHaveBeenCalledWith(prisma, 1, 2);
            expect(prisma.order.create).toHaveBeenCalled();
            expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 50 } });
            expect(redis.delete).toHaveBeenCalledWith(`cart:user:${USER_ID}`);
            expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
                data: { eventType: OutboxEventType.ORDER_CREATED, payload: { orderId: ORDER_ID, userId: USER_ID } },
            });
            expect(result).toBe(createdOrder);
        });

        it("does not report a failed order after the database commits when Redis fails", async () => {
            prisma.book.findMany.mockResolvedValue([makeBook()]);
            prisma.order.create.mockResolvedValue(makeOrder());
            prisma.cart.findUnique.mockResolvedValue(null);
            redis.delete.mockRejectedValue(new Error("Redis down"));
            await expect(service.createOrder(validRequest, USER_ID)).resolves.toMatchObject({ id: ORDER_ID });
            expect(prisma.outboxEvent.create).toHaveBeenCalledOnce();
        });

        it("ném BadRequestException khi danh sách sản phẩm rỗng", async () => {
            await expect(
                service.createOrder({ shippingAddress: "123 Le Loi, Quan 1, TP.HCM", orderItems: [] }, USER_ID)
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("ném BadRequestException khi địa chỉ giao hàng dưới 10 ký tự", async () => {
            await expect(
                service.createOrder({ shippingAddress: "123 Short", orderItems: [{ bookId: 1, quantity: 1 }] }, USER_ID)
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("ném BadRequestException khi trùng sách trong orderItems", async () => {
            const requestWithDuplicate = {
                shippingAddress: "123 Le Loi, Quan 1, TP.HCM",
                orderItems: [
                    { bookId: 1, quantity: 1 },
                    { bookId: 1, quantity: 2 },
                ],
            };
            await expect(service.createOrder(requestWithDuplicate, USER_ID)).rejects.toBeInstanceOf(BadRequestException);
        });

        it("ném NotFoundException khi sách không tồn tại hoặc INACTIVE", async () => {
            prisma.book.findMany.mockResolvedValue([]);

            await expect(service.createOrder(validRequest, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe("getOrderById", () => {
        it("trả về đơn hàng nếu tìm thấy", async () => {
            const order = makeOrder();
            prisma.order.findFirst.mockResolvedValue(order);

            const result = await service.getOrderById(ORDER_ID, USER_ID);

            expect(result).toBe(order);
            expect(prisma.order.findFirst).toHaveBeenCalledWith({
                where: { id: ORDER_ID, userId: USER_ID },
                include: { orderItems: { include: { book: true } } },
            });
        });

        it("ném NotFoundException khi không tìm thấy đơn hàng", async () => {
            prisma.order.findFirst.mockResolvedValue(null);

            await expect(service.getOrderById(999, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe("getOrders", () => {
        it("trả về danh sách đơn hàng từ DB", async () => {
            const orders = [makeOrder()];
            prisma.order.findMany.mockResolvedValue(orders);

            const result = await service.getOrders(USER_ID);

            expect(result).toBe(orders);
            expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: USER_ID } }));
        });
    });

    it("does not expose or update another customer's order", async () => {
        prisma.order.findFirst.mockResolvedValue(null);
        await expect(service.getOrderById(ORDER_ID, 8)).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.updateOrder(ORDER_ID, { shippingAddress: "456 Nguyen Hue" }, 8))
            .rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: ORDER_ID, userId: 8 },
        }));
        expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it("updates only the owner's shipping address", async () => {
        prisma.order.findFirst.mockResolvedValue(makeOrder());
        prisma.order.update.mockResolvedValue(makeOrder());
        await service.updateOrder(ORDER_ID, { shippingAddress: "456 Nguyen Hue" }, USER_ID);
        expect(prisma.order.update).toHaveBeenCalledWith({
            where: { id: ORDER_ID, userId: USER_ID },
            data: { shippingAddress: "456 Nguyen Hue" },
        });
    });

    describe("updateStatusOrder", () => {
        it("cập nhật trạng thái đơn hàng thành công", async () => {
            const existingOrder = makeOrder();
            const updatedOrder = makeOrder({ status: "COMPLETED" });

            prisma.order.findUnique.mockResolvedValue(existingOrder);
            prisma.order.update.mockResolvedValue(updatedOrder);

            const result = await service.updateStatusOrder(ORDER_ID, { status: "COMPLETED" } as any);

            expect(prisma.order.update).toHaveBeenCalledWith({
                where: { id: ORDER_ID },
                data: { status: "COMPLETED" },
            });
            expect(result).toBe(updatedOrder);
        });
    });
});
