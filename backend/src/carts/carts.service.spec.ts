import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CartsService } from "./carts.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";

// Mock Prisma Client đã sinh để test chạy được mà không cần `prisma generate`.
vi.mock("../generated/prisma/client.js", () => ({
    PrismaClient: class {},
    Prisma: {},
}));

const USER_ID = 7;
const cart = { id: 100, userId: USER_ID, cartItems: [] };
const activeBook = { id: 1, status: "ACTIVE", stockQuantity: 5 };

describe("CartsService", () => {
    let service: CartsService;

    const prisma = {
        cart: { findUnique: vi.fn(), create: vi.fn() },
        book: { findUnique: vi.fn() },
        cartItem: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    };
    const redis = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CartsService,
                { provide: PrismaService, useValue: prisma },
                { provide: RedisService, useValue: redis },
            ],
        }).compile();

        service = module.get<CartsService>(CartsService);
    });

    describe("getCartById", () => {
        it("cache hit: trả giỏ từ Redis, không truy vấn DB", async () => {
            redis.get.mockResolvedValue(cart);

            await expect(service.getCartById(USER_ID)).resolves.toBe(cart);
            expect(redis.get).toHaveBeenCalledWith(`cart:user:${USER_ID}`);
            expect(prisma.cart.findUnique).not.toHaveBeenCalled();
        });

        it("cache miss: đọc giỏ từ DB và lưu cache 300 giây", async () => {
            redis.get.mockResolvedValue(null);
            prisma.cart.findUnique.mockResolvedValue(cart);

            await expect(service.getCartById(USER_ID)).resolves.toBe(cart);
            expect(redis.set).toHaveBeenCalledWith(`cart:user:${USER_ID}`, cart, 300);
        });

        it("tự tạo giỏ mới khi người dùng chưa có giỏ", async () => {
            redis.get.mockResolvedValue(null);
            prisma.cart.findUnique.mockResolvedValue(null);
            prisma.cart.create.mockResolvedValue(cart);

            await expect(service.getCartById(USER_ID)).resolves.toBe(cart);
            expect(prisma.cart.create).toHaveBeenCalledWith(
                expect.objectContaining({ data: { userId: USER_ID } })
            );
        });
    });

    describe("addToCart", () => {
        beforeEach(() => {
            redis.get.mockResolvedValue(cart);
        });

        it("ném NotFoundException khi sách không tồn tại", async () => {
            prisma.book.findUnique.mockResolvedValue(null);

            await expect(service.addToCart(USER_ID, { bookId: 99, quantity: 1 })).rejects.toBeInstanceOf(
                NotFoundException
            );
            expect(prisma.cartItem.create).not.toHaveBeenCalled();
        });

        it("ném NotFoundException khi sách đã INACTIVE", async () => {
            prisma.book.findUnique.mockResolvedValue({ ...activeBook, status: "INACTIVE" });

            await expect(service.addToCart(USER_ID, { bookId: 1, quantity: 1 })).rejects.toBeInstanceOf(
                NotFoundException
            );
        });

        it("ném BadRequestException khi số lượng vượt tồn kho", async () => {
            prisma.book.findUnique.mockResolvedValue(activeBook);
            prisma.cartItem.findUnique.mockResolvedValue(null);

            await expect(service.addToCart(USER_ID, { bookId: 1, quantity: 6 })).rejects.toBeInstanceOf(
                BadRequestException
            );
        });

        it("tính cả số lượng đã có trong giỏ khi kiểm tra tồn kho", async () => {
            prisma.book.findUnique.mockResolvedValue(activeBook);
            prisma.cartItem.findUnique.mockResolvedValue({ id: 1, quantity: 4 });

            // 4 đã có + 2 mới = 6 > tồn kho 5
            await expect(service.addToCart(USER_ID, { bookId: 1, quantity: 2 })).rejects.toBeInstanceOf(
                BadRequestException
            );
            expect(prisma.cartItem.update).not.toHaveBeenCalled();
        });

        it("tạo mục mới khi sách chưa có trong giỏ và xóa cache", async () => {
            const created = { id: 10, cartId: cart.id, bookId: 1, quantity: 2 };
            prisma.book.findUnique.mockResolvedValue(activeBook);
            prisma.cartItem.findUnique.mockResolvedValue(null);
            prisma.cartItem.create.mockResolvedValue(created);

            await expect(service.addToCart(USER_ID, { bookId: 1, quantity: 2 })).resolves.toBe(created);
            expect(prisma.cartItem.create).toHaveBeenCalledWith({
                data: { cartId: cart.id, bookId: 1, quantity: 2 },
            });
            expect(redis.delete).toHaveBeenCalledWith(`cart:user:${USER_ID}`);
        });

        it("cộng dồn số lượng khi sách đã có trong giỏ", async () => {
            const updated = { id: 10, cartId: cart.id, bookId: 1, quantity: 4 };
            prisma.book.findUnique.mockResolvedValue(activeBook);
            prisma.cartItem.findUnique.mockResolvedValue({ id: 10, quantity: 2 });
            prisma.cartItem.update.mockResolvedValue(updated);

            await expect(service.addToCart(USER_ID, { bookId: 1, quantity: 2 })).resolves.toBe(updated);
            expect(prisma.cartItem.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { quantity: 4 },
            });
        });
    });

    describe("updateCartItemQuantity", () => {
        it("chỉ tìm mục thuộc giỏ của chính người dùng", async () => {
            prisma.cartItem.findFirst.mockResolvedValue({ id: 10, book: activeBook });
            prisma.cartItem.update.mockResolvedValue({ id: 10, quantity: 3 });

            await service.updateCartItemQuantity(USER_ID, 10, { quantity: 3 });

            expect(prisma.cartItem.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 10, cart: { userId: USER_ID } } })
            );
        });

        it("ném NotFoundException khi mục giỏ thuộc người khác hoặc không tồn tại", async () => {
            prisma.cartItem.findFirst.mockResolvedValue(null);

            await expect(service.updateCartItemQuantity(USER_ID, 10, { quantity: 1 })).rejects.toBeInstanceOf(
                NotFoundException
            );
            expect(prisma.cartItem.update).not.toHaveBeenCalled();
        });

        it("ném BadRequestException khi số lượng mới vượt tồn kho", async () => {
            prisma.cartItem.findFirst.mockResolvedValue({ id: 10, book: activeBook });

            await expect(service.updateCartItemQuantity(USER_ID, 10, { quantity: 6 })).rejects.toBeInstanceOf(
                BadRequestException
            );
            expect(prisma.cartItem.update).not.toHaveBeenCalled();
        });

        it("cập nhật số lượng và xóa cache giỏ", async () => {
            const updated = { id: 10, quantity: 3 };
            prisma.cartItem.findFirst.mockResolvedValue({ id: 10, book: activeBook });
            prisma.cartItem.update.mockResolvedValue(updated);

            await expect(service.updateCartItemQuantity(USER_ID, 10, { quantity: 3 })).resolves.toBe(updated);
            expect(prisma.cartItem.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { quantity: 3 },
            });
            expect(redis.delete).toHaveBeenCalledWith(`cart:user:${USER_ID}`);
        });
    });

    describe("removeCartItem", () => {
        it("ném NotFoundException khi mục giỏ thuộc người khác hoặc không tồn tại", async () => {
            prisma.cartItem.findFirst.mockResolvedValue(null);

            await expect(service.removeCartItem(USER_ID, 10)).rejects.toBeInstanceOf(NotFoundException);
            expect(prisma.cartItem.delete).not.toHaveBeenCalled();
        });

        it("xóa mục giỏ của chính người dùng và xóa cache", async () => {
            const deleted = { id: 10, quantity: 2 };
            prisma.cartItem.findFirst.mockResolvedValue({ id: 10, book: activeBook });
            prisma.cartItem.delete.mockResolvedValue(deleted);

            await expect(service.removeCartItem(USER_ID, 10)).resolves.toBe(deleted);
            expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 10 } });
            expect(redis.delete).toHaveBeenCalledWith(`cart:user:${USER_ID}`);
        });
    });
});