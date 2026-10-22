import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

// Mock Prisma Client để test chạy độc lập
vi.mock("../generated/prisma/client.js", () => ({
    PrismaClient: class {},
    Prisma: {},
}));

describe("OrdersController", () => {
    let controller: OrdersController;

    const ordersService = {
        createOrder: vi.fn(),
        getOrders: vi.fn(),
        getOrderById: vi.fn(),
        updateOrder: vi.fn(),
        updateStatusOrder: vi.fn(),
    };

    const req = { user: { id: 7 } };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrdersController],
            providers: [{ provide: OrdersService, useValue: ordersService }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<OrdersController>(OrdersController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("createOrder truyền đúng dto và userId từ token", async () => {
        const dto = {
            shippingAddress: "123 Le Loi, Quan 1, TP.HCM",
            orderItems: [{ bookId: 1, quantity: 2 }],
        };
        ordersService.createOrder.mockResolvedValue({ id: 100 });

        await controller.createOrder(req, dto as any);

        expect(ordersService.createOrder).toHaveBeenCalledWith(dto, 7);
    });

    it("getOrders gọi orderService.getOrders", async () => {
        ordersService.getOrders.mockResolvedValue([]);

        await controller.getOrders(req);

        expect(ordersService.getOrders).toHaveBeenCalledWith(7);
    });

    it("getOrderById truyền id từ route param", async () => {
        ordersService.getOrderById.mockResolvedValue({ id: 100 });

        await controller.getOrderById(req, 100);

        expect(ordersService.getOrderById).toHaveBeenCalledWith(100, 7);
    });

    it("updateOrder truyền id và orderUpdateRequest", async () => {
        const dto = { shippingAddress: "456 Nguyen Hue" };
        ordersService.updateOrder.mockResolvedValue({ id: 100 });

        await controller.updateOrder(req, 100, dto as any);

        expect(ordersService.updateOrder).toHaveBeenCalledWith(100, dto, 7);
    });

    it("updateOrderStatus truyền id và status request dto", async () => {
        const dto = { status: "COMPLETED" };
        ordersService.updateStatusOrder.mockResolvedValue({ id: 100, status: "COMPLETED" });

        await controller.updateOrderStatus(100, dto as any);

        expect(ordersService.updateStatusOrder).toHaveBeenCalledWith(100, dto);
    });
});
