import { HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { NotificationType, OrderStatus } from "../src/generated/prisma/enums.js";

const baseUrl = process.env.E2E_BASE_URL;
const samplePassword = process.env.E2E_SAMPLE_PASSWORD;
const allowedOrigin = process.env.E2E_ALLOWED_ORIGIN ?? "http://localhost:31000";

describe.skipIf(!baseUrl)("container HTTP purchase flow (e2e)", () => {
    const api = () => request(baseUrl!);
    let customerA: string;
    let customerB: string;
    let staff: string;

    async function login(email: string): Promise<string> {
        const response = await api()
            .post("/auth/login")
            .send({ email, password: samplePassword })
            .expect(HttpStatus.OK);
        expect(response.body.success).toBe(true);
        expect(typeof response.body.data.accessToken).toBe("string");
        return response.body.data.accessToken as string;
    }

    beforeAll(async () => {
        if (!samplePassword) throw new Error("E2E_SAMPLE_PASSWORD is required");
        customerA = await login("customer-a@bookstore.example.com");
        customerB = await login("customer-b@bookstore.example.com");
        staff = await login("staff@bookstore.example.com");
    });

    it("validates books and isolates carts, orders, roles and notifications", async () => {
        const isbn = `audit-${randomUUID()}`;
        const book = {
            title: `Audit purchase ${isbn}`,
            isbn,
            description: "Isolated end to end purchase test",
            author: "Audit",
            category: "Testing",
            price: 120,
            stockQuantity: 5,
            coverImageUrl: "https://example.com/cover.jpg",
        };

        await api().get("/orders").expect(HttpStatus.UNAUTHORIZED);
        await api().post("/books").set("Authorization", `Bearer ${customerA}`)
            .send(book).expect(HttpStatus.FORBIDDEN);

        for (const invalid of [
            { ...book, price: -1 },
            { ...book, unexpected: true },
            { ...book, title: undefined },
        ]) {
            const response = await api().post("/books")
                .set("Authorization", `Bearer ${staff}`).send(invalid)
                .expect(HttpStatus.BAD_REQUEST);
            expect(response.body.success).toBe(false);
            expect(response.body.error.statusCode).toBe(HttpStatus.BAD_REQUEST);
        }

        const created = await api().post("/books")
            .set("Authorization", `Bearer ${staff}`).send(book)
            .expect(HttpStatus.CREATED);
        expect(created.body.success).toBe(true);
        const bookId = created.body.data.id as number;

        const initialDetail = await api().get(`/books/${bookId}`).expect(HttpStatus.OK);
        expect(Number(initialDetail.body.data.price)).toBe(book.price);
        await api().get("/books").expect(HttpStatus.OK);

        await api().patch(`/books/${bookId}`).set("Authorization", `Bearer ${staff}`)
            .send({ price: 130 }).expect(HttpStatus.OK);
        const updatedDetail = await api().get(`/books/${bookId}`).expect(HttpStatus.OK);
        expect(Number(updatedDetail.body.data.price)).toBe(130);
        const updatedList = await api().get("/books").expect(HttpStatus.OK);
        expect(Number(updatedList.body.data.find((item: { id: number }) => item.id === bookId).price)).toBe(130);

        let searchable = false;
        for (let attempt = 0; attempt < 40; attempt++) {
            const search = await api().get("/search/books")
                .query({ q: isbn }).expect(HttpStatus.OK);
            searchable = search.body.data.hits.some((item: { id: number }) => item.id === bookId);
            if (searchable) break;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        expect(searchable).toBe(true);

        const added = await api().post("/carts/items")
            .set("Authorization", `Bearer ${customerA}`)
            .send({ bookId, quantity: 1 }).expect(HttpStatus.CREATED);
        const cartItemId = added.body.data.id as number;
        const cartA = await api().get("/carts")
            .set("Authorization", `Bearer ${customerA}`).expect(HttpStatus.OK);
        const cartB = await api().get("/carts")
            .set("Authorization", `Bearer ${customerB}`).expect(HttpStatus.OK);
        expect(cartA.body.data.cartItems.some((item: { id: number }) => item.id === cartItemId)).toBe(true);
        expect(cartB.body.data.cartItems).toHaveLength(0);
        await api().patch(`/carts/items/${cartItemId}`)
            .set("Authorization", `Bearer ${customerB}`)
            .send({ quantity: 2 }).expect(HttpStatus.NOT_FOUND);

        const order = await api().post("/orders")
            .set("Authorization", `Bearer ${customerA}`)
            .send({ shippingAddress: "123 Audit Street, District 1", orderItems: [{ bookId, quantity: 1 }] })
            .expect(HttpStatus.CREATED);
        const orderId = order.body.data.id as number;
        expect(order.body.data.status).toBe(OrderStatus.PENDING);

        const owned = await api().get(`/orders/${orderId}`)
            .set("Authorization", `Bearer ${customerA}`).expect(HttpStatus.OK);
        expect(owned.body.data.id).toBe(orderId);
        await api().get(`/orders/${orderId}`)
            .set("Authorization", `Bearer ${customerB}`).expect(HttpStatus.NOT_FOUND);
        await api().patch(`/orders/${orderId}`)
            .set("Authorization", `Bearer ${customerB}`)
            .send({ shippingAddress: "999 Other Street, District 2" })
            .expect(HttpStatus.NOT_FOUND);
        const otherOrders = await api().get("/orders")
            .set("Authorization", `Bearer ${customerB}`).expect(HttpStatus.OK);
        expect(otherOrders.body.data.some((item: { id: number }) => item.id === orderId)).toBe(false);

        await api().patch(`/orders/${orderId}/status`)
            .set("Authorization", `Bearer ${customerA}`)
            .send({ status: OrderStatus.CONFIRMED }).expect(HttpStatus.FORBIDDEN);
        await api().patch(`/orders/${orderId}/status`)
            .set("Authorization", `Bearer ${staff}`)
            .send({ status: OrderStatus.CONFIRMED }).expect(HttpStatus.OK);

        const clearedCart = await api().get("/carts")
            .set("Authorization", `Bearer ${customerA}`).expect(HttpStatus.OK);
        expect(clearedCart.body.data.cartItems).toHaveLength(0);
        const reducedBook = await api().get(`/books/${bookId}`).expect(HttpStatus.OK);
        expect(reducedBook.body.data.stockQuantity).toBe(4);

        let notifications: Array<{ notifyType: NotificationType; message: string }> = [];
        for (let attempt = 0; attempt < 30; attempt++) {
            const response = await api().get("/notifications")
                .set("Authorization", `Bearer ${customerA}`).expect(HttpStatus.OK);
            notifications = response.body.data;
            if (notifications.some((item) => item.message === `Order #${orderId} created`)) break;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        expect(notifications.filter((item) =>
            item.notifyType === NotificationType.ORDER_CREATED && item.message === `Order #${orderId} created`
        )).toHaveLength(1);
        const otherNotifications = await api().get("/notifications")
            .set("Authorization", `Bearer ${customerB}`).expect(HttpStatus.OK);
        expect(otherNotifications.body.data.some((item: { message: string }) =>
            item.message === `Order #${orderId} created`
        )).toBe(false);

        const cookieLogin = await api().post("/auth/login")
            .send({ email: "customer-a@bookstore.example.com", password: samplePassword })
            .expect(HttpStatus.OK);
        const setCookie = cookieLogin.headers["set-cookie"];
        const refreshCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).split(";")[0];
        await api().post("/auth/refresh-token")
            .set("Cookie", refreshCookie)
            .set("Origin", "https://attacker.example.com")
            .expect(HttpStatus.FORBIDDEN);
        await api().post("/auth/refresh-token")
            .set("Cookie", refreshCookie)
            .set("Origin", allowedOrigin)
            .expect(HttpStatus.CREATED);
    }, 60_000);
});
