import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "./orders.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BooksService } from "../books/books.service.js";
import { RedisService } from "../redis/redis.service.js";
import { Prisma } from "../generated/prisma/client.js";

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
const customer = { id: USER_ID, role: { roleName: "CUSTOMER" } } as any;

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
        cart: { findUnique: vi.fn() },
        cartItem: { deleteMany: vi.fn() },
        outboxEvent: { create: vi.fn() },
    };

    const booksService = {
        reduceBookStock: vi.fn(),
        invalidateBookCaches: vi.fn(),
    };

    const redis = {
        incrementRevision: vi.fn(),
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

        it("tạo đơn hàng, trừ kho, xóa giỏ và lưu outbox cùng transaction", async () => {
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
            expect(redis.incrementRevision).toHaveBeenCalledWith(`cart:user:${USER_ID}:revision`);
            expect(prisma.outboxEvent.create).toHaveBeenCalledWith({ data: {
                topic: "order.created", payload: expect.objectContaining({ id: ORDER_ID, userId: USER_ID }),
            } });
            expect(booksService.invalidateBookCaches).toHaveBeenCalledWith(1);
            expect(result).toBe(createdOrder);
        });

        it("không trả đơn thành công nếu ghi outbox thất bại", async () => {
            prisma.book.findMany.mockResolvedValue([makeBook()]);
            prisma.order.create.mockResolvedValue(makeOrder());
            prisma.cart.findUnique.mockResolvedValue(null);
            prisma.outboxEvent.create.mockRejectedValue(new Error("DB error"));
            await expect(service.createOrder(validRequest, USER_ID)).rejects.toThrow("DB error");
            expect(redis.incrementRevision).not.toHaveBeenCalled();
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

            const result = await service.getOrderById(ORDER_ID, customer);

            expect(result).toBe(order);
            expect(prisma.order.findFirst).toHaveBeenCalledWith({
                where: { id: ORDER_ID, userId: USER_ID },
                include: { orderItems: { include: { book: { select: { id: true, title: true } } } } },
            });
        });

        it("ném NotFoundException khi không tìm thấy đơn hàng", async () => {
            prisma.order.findFirst.mockResolvedValue(null);

            await expect(service.getOrderById(999, customer)).rejects.toBeInstanceOf(NotFoundException);
        });

        it("ẩn đơn của người khác bằng điều kiện sở hữu trong truy vấn", async () => {
            prisma.order.findFirst.mockResolvedValue(null);
            await expect(service.getOrderById(ORDER_ID, customer)).rejects.toBeInstanceOf(NotFoundException);
            expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: ORDER_ID, userId: USER_ID },
            }));
        });

        it("nhân viên được tìm đơn theo mã không giới hạn chủ sở hữu", async () => {
            const order = makeOrder({ userId: 99 });
            prisma.order.findFirst.mockResolvedValue(order);
            await expect(service.getOrderById(ORDER_ID, { id: 1, role: { roleName: "STAFF" } } as any)).resolves.toBe(order);
            expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ORDER_ID } }));
        });
    });

    describe("getOrders", () => {
        it("trả về danh sách đơn hàng từ DB", async () => {
            const orders = [makeOrder()];
            prisma.order.findMany.mockResolvedValue(orders);

            const result = await service.getOrders(customer);

            expect(result).toBe(orders);
            expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: USER_ID } }));
        });

        it("quản trị viên xem được tất cả đơn", async () => {
            prisma.order.findMany.mockResolvedValue([]);
            await service.getOrders({ id: 1, role: { roleName: "ADMIN" } } as any);
            expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
        });
    });

    describe("updateStatusOrder", () => {
        it("cập nhật trạng thái đơn hàng thành công", async () => {
            const existingOrder = makeOrder();
            const updatedOrder = makeOrder({ status: "COMPLETED" });

            prisma.order.findUnique.mockResolvedValue(existingOrder);
            prisma.order.update.mockResolvedValue(updatedOrder);

            const result = await service.updateStatusOrder(ORDER_ID, { status: "COMPLETED" } as any);

            expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: ORDER_ID },
                data: { status: "COMPLETED" },
            }));
            expect(result).toBe(updatedOrder);
        });
    });
});
