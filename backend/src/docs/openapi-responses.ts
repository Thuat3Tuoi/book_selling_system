import { HttpStatus } from "@nestjs/common";
import type { OpenAPIObject, OperationObject, ReferenceObject, SchemaObject } from "@nestjs/swagger";
import { BookStatus, NotificationType, OrderStatus, RoleName } from "../generated/prisma/enums.js";
import { HealthStatus } from "../common/health-status.enum.js";

type ResponseSchema = SchemaObject | ReferenceObject;
const ref = (name: string): ReferenceObject => ({ $ref: `#/components/schemas/${name}` });
const list = (items: ResponseSchema): SchemaObject => ({ type: "array", items });
const envelope = (data: ResponseSchema, meta?: ResponseSchema): SchemaObject => ({
    type: "object",
    required: meta ? ["success", "data", "meta"] : ["success", "data"],
    properties: {
        success: { type: "boolean", enum: [true] },
        data,
        ...(meta ? { meta } : {}),
    },
});

const resultSchemas: Record<string, ResponseSchema> = {
    AppController_getHello: { type: "string" },
    HealthController_check: { type: "object", required: ["status"], properties: {
        status: { type: "string", enum: Object.values(HealthStatus) },
    } },
    OrdersController_createOrder: ref("OrderResponse"),
    OrdersController_getOrders: list(ref("OrderResponse")),
    OrdersController_getOrderById: ref("OrderResponse"),
    OrdersController_updateOrder: ref("OrderResponse"),
    OrdersController_updateOrderStatus: ref("OrderResponse"),
    BooksController_createBook: ref("BookResponse"),
    BooksController_getBooks: list(ref("BookResponse")),
    BooksController_getBookById: ref("BookResponse"),
    BooksController_updateBook: ref("BookResponse"),
    BooksController_deleteBook: ref("BookResponse"),
    SearchController_searchBooks: ref("SearchResultResponse"),
    NotificationsController_createNotification: ref("NotificationResponse"),
    NotificationsController_getNotifications: list(ref("NotificationResponse")),
    NotificationsController_getNotificationById: ref("NotificationResponse"),
    AuthController_register: ref("MessageResponse"),
    AuthController_login: ref("LoginResponse"),
    AuthController_refreshToken: ref("LoginResponse"),
    AuthController_getProfile: ref("AuthPrincipalResponse"),
    AuthController_logout: ref("MessageResponse"),
    UserController_getMe: ref("UserResponse"),
    CartsController_getCartById: ref("CartResponse"),
    CartsController_addToCart: ref("CartItemResponse"),
    CartsController_updateCartItem: ref("CartItemResponse"),
    CartsController_removeCartItem: ref("CartItemResponse"),
    OrderItemsController_getOrderItems: list(ref("OrderItemResponse")),
    OrderItemsController_getOrderItemById: ref("OrderItemResponse"),
};

const successMeta: Record<string, ResponseSchema> = {
    BooksController_getBooks: ref("PaginationMetaResponse"),
};

const dateTime: SchemaObject = { type: "string", format: "date-time" };
const integer: SchemaObject = { type: "integer" };
const decimal: SchemaObject = { type: "string", description: "Decimal value serialized as a string" };

const responseModels: Record<string, SchemaObject> = {
    BookResponse: {
        type: "object", required: ["id", "title", "isbn", "description", "author", "category", "price", "stockQuantity", "coverImageUrl", "status", "createdAt", "updatedAt"],
        properties: {
            id: integer, title: { type: "string" }, isbn: { type: "string" },
            description: { type: "string" }, author: { type: "string" }, category: { type: "string" },
            price: decimal, stockQuantity: integer, coverImageUrl: { type: "string" },
            status: { type: "string", enum: Object.values(BookStatus) },
            createdAt: dateTime, updatedAt: dateTime,
        },
    },
    OrderItemResponse: {
        type: "object", required: ["id", "orderId", "bookId", "unitPrice", "quantity", "totalPrice"],
        properties: {
            id: integer, orderId: integer, bookId: integer, unitPrice: decimal,
            quantity: integer, totalPrice: decimal, book: ref("BookResponse"),
        },
    },
    OrderResponse: {
        type: "object", required: ["id", "userId", "totalAmount", "shippingAddress", "status", "createdAt"],
        properties: {
            id: integer, userId: integer, totalAmount: decimal, shippingAddress: { type: "string" },
            status: { type: "string", enum: Object.values(OrderStatus) }, createdAt: dateTime,
            orderItems: list(ref("OrderItemResponse")),
        },
    },
    NotificationResponse: {
        type: "object", required: ["id", "notifyType", "userId", "message", "status", "createdAt"],
        properties: {
            id: integer, notifyType: { type: "string", enum: Object.values(NotificationType) },
            userId: integer, message: { type: "string" }, eventId: { type: "string", nullable: true },
            status: { type: "boolean" }, createdAt: dateTime,
        },
    },
    CartItemResponse: {
        type: "object", required: ["id", "cartId", "bookId", "quantity"],
        properties: {
            id: integer, cartId: integer, bookId: integer, quantity: integer,
            book: ref("BookResponse"),
        },
    },
    CartResponse: {
        type: "object", required: ["id", "userId", "cartItems"],
        properties: { id: integer, userId: integer, cartItems: list(ref("CartItemResponse")) },
    },
    UserResponse: {
        type: "object", required: ["id", "firstName", "lastName", "email", "createdAt", "status", "roleId"],
        properties: {
            id: integer, firstName: { type: "string" }, lastName: { type: "string" },
            email: { type: "string", format: "email" }, phoneNumber: { type: "string", nullable: true },
            address: { type: "string", nullable: true }, createdAt: dateTime,
            status: { type: "boolean" }, roleId: integer,
        },
    },
    AuthPrincipalResponse: {
        type: "object", required: ["id", "email", "role"],
        properties: { id: integer, email: { type: "string", format: "email" },
            role: { type: "string", enum: Object.values(RoleName) } },
    },
    LoginResponse: {
        type: "object", required: ["accessToken", "user"],
        properties: {
            accessToken: { type: "string" },
            user: { type: "object", required: ["id", "firstName", "lastName", "email", "roleId"],
                properties: {
                    id: integer, firstName: { type: "string" }, lastName: { type: "string" },
                    email: { type: "string", format: "email" }, phone: { type: "string", nullable: true },
                    address: { type: "string", nullable: true }, roleId: integer,
                } },
        },
    },
    MessageResponse: { type: "object", required: ["message"], properties: { message: { type: "string" } } },
    PaginationMetaResponse: {
        type: "object", required: ["page", "limit", "total", "totalPages"],
        properties: { page: integer, limit: integer, total: integer, totalPages: integer },
    },
    SearchBookResponse: {
        type: "object", required: ["id", "title", "author", "isbn", "category", "description", "price", "coverImageUrl"],
        properties: {
            id: integer, title: { type: "string" }, author: { type: "string" },
            isbn: { type: "string" }, category: { type: "string" }, description: { type: "string" },
            price: { type: "number" }, coverImageUrl: { type: "string" },
        },
    },
    SearchResultResponse: {
        type: "object", required: ["hits", "totalHits", "processingTimeMs", "page", "limit"],
        properties: {
            hits: list(ref("SearchBookResponse")), totalHits: integer,
            processingTimeMs: integer, page: integer, limit: integer,
        },
    },
    ErrorEnvelopeResponse: {
        type: "object", required: ["success", "error"],
        properties: {
            success: { type: "boolean", enum: [false] },
            error: { type: "object", required: ["statusCode", "message"], properties: {
                statusCode: integer, message: { type: "string" }, details: list({ type: "string" }),
            } },
        },
    },
};

export function describeResponseEnvelopes(document: OpenAPIObject): OpenAPIObject {
    document.components ??= {};
    document.components.schemas = { ...document.components.schemas, ...responseModels };

    for (const path of Object.values(document.paths)) {
        for (const operation of Object.values(path)) {
            if (!operation || typeof operation !== "object" || !("operationId" in operation)) continue;
            const endpoint = operation as OperationObject;
            const operationId = endpoint.operationId;
            if (!operationId) continue;
            const data = resultSchemas[operationId];
            if (!data) throw new Error(`OpenAPI response schema missing for ${operationId}`);

            for (const [code, response] of Object.entries(endpoint.responses)) {
                if (!response || "$ref" in response) continue;
                const success = Number(code) < HttpStatus.BAD_REQUEST;
                response.description ||= success ? "Response envelope" : "Error envelope";
                response.content ??= { "application/json": {
                    schema: success ? envelope(data, successMeta[operationId]) : ref("ErrorEnvelopeResponse"),
                } };
            }

            if (endpoint.security?.length) {
                endpoint.responses[HttpStatus.UNAUTHORIZED] ??= {
                    description: "Authentication required",
                    content: { "application/json": { schema: ref("ErrorEnvelopeResponse") } },
                };
            }
            if (endpoint.requestBody) {
                endpoint.responses[HttpStatus.BAD_REQUEST] ??= {
                    description: "Invalid request",
                    content: { "application/json": { schema: ref("ErrorEnvelopeResponse") } },
                };
            }
        }
    }

    return document;
}
