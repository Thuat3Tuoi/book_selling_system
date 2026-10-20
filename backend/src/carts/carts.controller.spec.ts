import { Test, TestingModule } from "@nestjs/testing";
import { CartsController } from "./carts.controller.js";
import { CartsService } from "./carts.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

// Mock Prisma Client đã sinh để test chạy được mà không cần `prisma generate`.
vi.mock("../generated/prisma/client.js", () => ({
    PrismaClient: class {},
    Prisma: {},
}));

describe("CartsController", () => {
    let controller: CartsController;

    const cartsService = {
        getCartById: vi.fn(),
        addToCart: vi.fn(),
        updateCartItemQuantity: vi.fn(),
        removeCartItem: vi.fn(),
    };
    // Giả lập request đã qua JwtAuthGuard: user lấy từ token
    const req = { user: { id: 7 } };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CartsController],
            providers: [{ provide: CartsService, useValue: cartsService }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<CartsController>(CartsController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("getCartById dùng userId lấy từ token", async () => {
        cartsService.getCartById.mockResolvedValue({ id: 1 });

        await controller.getCartById(req);

        expect(cartsService.getCartById).toHaveBeenCalledWith(7);
    });

    it("addToCart dùng userId lấy từ token và dữ liệu từ body", async () => {
        cartsService.addToCart.mockResolvedValue({ id: 10, cartId: 1, bookId: 1, quantity: 2 });
        await controller.addToCart(req, { bookId: 1, quantity: 2 });

        expect(cartsService.addToCart).toHaveBeenCalledWith(7, { bookId: 1, quantity: 2 });
    });

    it("updateCartItem truyền userId, cartItemId và quantity", async () => {
        cartsService.updateCartItemQuantity.mockResolvedValue({ id: 10, cartId: 1, bookId: 1, quantity: 3 });
        await controller.updateCartItem(req, 10, { quantity: 3 });

        expect(cartsService.updateCartItemQuantity).toHaveBeenCalledWith(7, 10, { quantity: 3 });
    });

    it("removeCartItem truyền userId và cartItemId", async () => {
        cartsService.removeCartItem.mockResolvedValue({ id: 10, cartId: 1, bookId: 1, quantity: 3 });
        await controller.removeCartItem(req, 10);

        expect(cartsService.removeCartItem).toHaveBeenCalledWith(7, 10);
    });
});
