import { Test } from "@nestjs/testing";
import { ValidationPipe, NotFoundException, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { BooksController } from "../books/books.controller.js";
import { BooksService } from "../books/books.service.js";
import { OrdersController } from "../orders/orders.controller.js";
import { OrdersService } from "../orders/orders.service.js";
import { NotificationsController } from "../notifications/notifications.controller.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { NotificationType } from "../generated/prisma/enums.js";

const validBook = {
    title: "Clean Code", isbn: "9780132350884", description: "Example",
    author: "Robert C. Martin", category: "Software", price: 100,
    stockQuantity: 2, coverImageUrl: "https://example.com/cover.jpg",
};

describe("HTTP authorization and validation", () => {
    const books = { createBook: vi.fn() };
    const orders = { getOrderById: vi.fn(), getOrders: vi.fn(), updateOrder: vi.fn(), updateStatusOrder: vi.fn() };
    const notifications = { createNotification: vi.fn() };
    let app: INestApplication;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [BooksController, OrdersController, NotificationsController],
            providers: [
                { provide: BooksService, useValue: books },
                { provide: OrdersService, useValue: orders },
                { provide: NotificationsService, useValue: notifications },
            ],
        }).overrideGuard(JwtAuthGuard).useValue({
            canActivate: (context: any) => {
                const req = context.switchToHttp().getRequest();
                const identity = req.headers.authorization?.replace("Bearer ", "");
                if (!identity) return false;
                req.user = identity === "staff"
                    ? { id: 9, role: { roleName: "STAFF" } }
                    : { id: identity === "alice" ? 1 : 2, role: { roleName: "CUSTOMER" } };
                return true;
            },
        }).compile();
        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();
    });

    afterAll(async () => { await app.close(); });
    beforeEach(() => { vi.resetAllMocks(); books.createBook.mockResolvedValue({ id: 1 }); });

    it("rejects negative price, extra fields, and missing fields through the actual pipe", async () => {
        const server = app.getHttpServer();
        for (const payload of [
            { ...validBook, price: -1 },
            { ...validBook, isAdmin: true },
            { ...validBook, title: undefined },
        ]) {
            await request(server).post("/books").set("Authorization", "Bearer staff").send(payload).expect(400);
        }
        expect(books.createBook).not.toHaveBeenCalled();
        await request(server).post("/books").set("Authorization", "Bearer staff").send(validBook).expect(201);
        expect(books.createBook).toHaveBeenCalledWith(expect.objectContaining(validBook));
    });

    it("rejects invalid pagination before querying books", async () => {
        const server = app.getHttpServer();
        for (const query of ["page=-1", "limit=0", "limit=101", "page=abc", "limit=1.5", "extra=1"]) {
            await request(server).get(`/books?${query}`).expect(400);
        }
        expect(books.createBook).not.toHaveBeenCalled();
    });

    it("denies customer book writes and order status changes", async () => {
        const server = app.getHttpServer();
        await request(server).post("/books").set("Authorization", "Bearer alice").send(validBook).expect(403);
        await request(server).patch("/orders/11/status").set("Authorization", "Bearer alice")
            .send({ status: "CONFIRMED" }).expect(403);
        await request(server).post("/notifications").set("Authorization", "Bearer alice")
            .send({ notifyType: "INFO", userId: 1, message: "hello" }).expect(403);
        expect(orders.updateStatusOrder).not.toHaveBeenCalled();
    });

    it("validates notification type from the enum at the HTTP boundary", async () => {
        notifications.createNotification.mockResolvedValue({ id: 1 });
        const server = app.getHttpServer();
        await request(server).post("/notifications").set("Authorization", "Bearer staff")
            .send({ notifyType: "UNKNOWN", userId: 1, message: "hello" }).expect(400);
        await request(server).post("/notifications").set("Authorization", "Bearer staff")
            .send({ notifyType: NotificationType.INFO, userId: 1, message: "hello" }).expect(201);
        expect(notifications.createNotification).toHaveBeenCalledOnce();
    });

    it("passes separate identities to order reads and returns 404 for cross access", async () => {
        orders.getOrderById.mockImplementation((id, user) => {
            if (id === 11 && user.id === 1) return { id, userId: user.id };
            throw new NotFoundException();
        });
        const server = app.getHttpServer();
        await request(server).get("/orders/11").set("Authorization", "Bearer alice").expect(200);
        await request(server).get("/orders/11").set("Authorization", "Bearer bob").expect(404);
        expect(orders.getOrderById).toHaveBeenCalledWith(11, expect.objectContaining({ id: 1 }));
        expect(orders.getOrderById).toHaveBeenCalledWith(11, expect.objectContaining({ id: 2 }));
    });

    it("returns 404 for cross-account PATCH and allows the owner", async () => {
        orders.updateOrder.mockImplementation((id, dto, user) => {
            if (id === 11 && user.id === 1) return { id, userId: user.id, ...dto };
            throw new NotFoundException();
        });
        const server = app.getHttpServer();
        const dto = { shippingAddress: "456 Nguyen Hue, District 1" };
        await request(server).patch("/orders/11").set("Authorization", "Bearer alice").send(dto).expect(200);
        await request(server).patch("/orders/11").set("Authorization", "Bearer bob").send(dto).expect(404);
        expect(orders.updateOrder).toHaveBeenCalledWith(11, expect.objectContaining(dto), expect.objectContaining({ id: 1 }));
        expect(orders.updateOrder).toHaveBeenCalledWith(11, expect.objectContaining(dto), expect.objectContaining({ id: 2 }));
    });
});
