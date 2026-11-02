import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject, type OperationObject } from "@nestjs/swagger";
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
import { BooksController } from "./books/books.controller.js";
import { BooksService } from "./books/books.service.js";
import { OrdersController } from "./orders/orders.controller.js";
import { OrdersService } from "./orders/orders.service.js";
import { NotificationsController } from "./notifications/notifications.controller.js";
import { NotificationsService } from "./notifications/notifications.service.js";
import { CartsController } from "./carts/carts.controller.js";
import { CartsService } from "./carts/carts.service.js";
import { UserController } from "./user/user.controller.js";
import { UserService } from "./user/user.service.js";
import { OrderItemsController } from "./order-items/order-items.controller.js";
import { OrderItemsService } from "./order-items/order-items.service.js";
import { SearchController } from "./search/search.controller.js";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor.js";


describe("OpenAPI JSON response schemas", () => {
    let app: INestApplication;
    let document: OpenAPIObject;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
            controllers: [
                AuthController, HealthController, BooksController, OrdersController,
                NotificationsController, CartsController, UserController,
                OrderItemsController, SearchController,
            ],
            providers: [
                { provide: AuthService, useValue: {} },
                { provide: PrismaService, useValue: {} },
                { provide: RedisService, useValue: {} },
                { provide: SearchService, useValue: {} },
                { provide: BooksService, useValue: { getCategories: () => ["New database category"] } },
                { provide: OrdersService, useValue: {} },
                { provide: NotificationsService, useValue: {} },
                { provide: CartsService, useValue: {} },
                { provide: UserService, useValue: {} },
                { provide: OrderItemsService, useValue: {} },
            ],
        })
            .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
            .overrideGuard(LocalAuthGuard).useValue({ canActivate: () => true })
            .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
            .compile();
        app = module.createNestApplication();
        app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
        document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("API test").setVersion("1.0").build());
        describeResponseEnvelopes(document);
        SwaggerModule.setup("api/docs", app, document);
        await app.init();
    });

    afterAll(async () => app.close());

    it("describes all operations discovered from the actual HTTP controllers", () => {
        const operations = Object.values(document.paths).flatMap((path) => Object.values(path))
            .filter((operation): operation is OperationObject => Boolean(
                operation && typeof operation === "object" && "operationId" in operation
            ));
        expect(operations.length).toBeGreaterThan(0);
        expect(operations.map(({ operationId }) => operationId)).toContain("BooksController_getCategories");
        for (const operation of operations) {
            const successfulResponses = Object.entries(operation.responses)
                .filter(([status]) => Number(status) >= 200 && Number(status) < 300);
            expect(successfulResponses.length).toBeGreaterThan(0);
            for (const [, response] of successfulResponses) {
                expect(response).not.toHaveProperty("$ref");
                if (!("$ref" in response)) {
                    expect(response.content?.["application/json"]?.schema).toBeDefined();
                }
            }
        }
    });

    it("serves categories and their string-array schema after OpenAPI initialization", async () => {
        await request(app.getHttpServer()).get("/books/categories")
            .expect(200, { success: true, data: ["New database category"] });
        const { body } = await request(app.getHttpServer()).get("/api/docs-json").expect(200);
        const schema = body.paths["/books/categories"].get.responses["200"].content["application/json"].schema;
        expect(schema.properties.data).toEqual({ type: "array", items: { type: "string" } });
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
