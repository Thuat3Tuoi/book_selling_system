import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import request from "supertest";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { HealthController } from "./health.controller.js";
import { PrismaService } from "./prisma/prisma.service.js";
import { RedisService } from "./redis/redis.service.js";
import { SearchService } from "./search/search.service.js";
import { ThrottlerGuard } from "@nestjs/throttler";
import { LocalAuthGuard } from "./guards/local-auth.guard.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { describeResponseEnvelopes } from "./docs/openapi-responses.js";
import { ThrottlerModule } from "@nestjs/throttler";

describe("OpenAPI JSON response schemas", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
            controllers: [AuthController, HealthController],
            providers: [
                { provide: AuthService, useValue: {} },
                { provide: PrismaService, useValue: {} },
                { provide: RedisService, useValue: {} },
                { provide: SearchService, useValue: {} },
            ],
        })
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .overrideGuard(LocalAuthGuard).useValue({ canActivate: () => true })
            .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
            .compile();
        app = module.createNestApplication();
        const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("API test").setVersion("1.0").build());
        describeResponseEnvelopes(document);
        SwaggerModule.setup("api/docs", app, document);
        await app.init();
    });

    afterAll(async () => app.close());

    it("adds response schemas to all 27 operations in the current API map", () => {
        const operationIds = [
            "HealthController_check",
            "OrdersController_createOrder", "OrdersController_getOrders", "OrdersController_getOrderById",
            "OrdersController_updateOrder", "OrdersController_updateOrderStatus",
            "BooksController_createBook", "BooksController_getBooks", "BooksController_getBookById",
            "BooksController_updateBook", "BooksController_deleteBook",
            "SearchController_searchBooks",
            "NotificationsController_createNotification", "NotificationsController_getNotifications",
            "NotificationsController_getNotificationById",
            "AuthController_register", "AuthController_login", "AuthController_refreshToken",
            "AuthController_getProfile", "AuthController_logout",
            "UserController_getMe",
            "CartsController_getCartById", "CartsController_addToCart", "CartsController_updateCartItem",
            "CartsController_removeCartItem",
            "OrderItemsController_getOrderItems", "OrderItemsController_getOrderItemById",
        ];
        const paths = Object.fromEntries(operationIds.map((operationId, index) => [
            `/operation-${index + 1}`,
            { get: { operationId, responses: { "200": { description: "Response" } } } },
        ]));
        const document = {
            openapi: "3.0.0",
            info: { title: "Book Selling API", version: "1.0" },
            paths,
        } as Parameters<typeof describeResponseEnvelopes>[0];

        describeResponseEnvelopes(document);
        const operations = Object.values(document.paths).flatMap((path) => Object.values(path))
            .filter((operation): operation is NonNullable<typeof operation> => Boolean(operation));
        const withResponseSchema = operations.filter((operation) =>
            Object.values((operation as { responses: Record<string, { content?: Record<string, { schema?: unknown }> }> }).responses)
                .some((response) => Boolean(response.content?.["application/json"]?.schema)),
        );

        expect(operations).toHaveLength(27);
        expect(withResponseSchema).toHaveLength(27);
    });

    it("serves /api/docs-json with response schemas for the three repaired operations", async () => {
        const { body } = await request(app.getHttpServer()).get("/api/docs-json").expect(200);
        const checks = [
            ["/health", "get", "200"],
            ["/auth/register", "post", "201"],
            ["/auth/logout", "post", "201"],
        ] as const;
        for (const [path, method, status] of checks) {
            expect(body.paths[path][method].responses[status].content["application/json"].schema).toBeDefined();
        }
        expect(body.components.schemas.HealthResponseDto.properties.status.example).toBe("ok");
        expect(body.components.schemas.MessageResponseDto.properties.message.type).toBe("string");
    });
});
