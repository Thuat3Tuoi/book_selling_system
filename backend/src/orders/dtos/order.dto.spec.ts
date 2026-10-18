import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { OrderCreaterRequest } from "./order-creation-request.dto.js";
import { OrderUpdateStatusRequest } from "./order-update-status-request.js";
import { OrderStatus } from "../../generated/prisma/enums.js";

async function errorsOf<T extends object>(cls: new () => T, payload: Record<string, unknown>) {
    const errors = await validate(plainToInstance(cls, payload));
    return errors.map((e) => e.property);
}

describe("OrderCreaterRequest DTO", () => {
    const validPayload = {
        shippingAddress: "123 Le Loi, Quan 1, TP.HCM",
        orderItems: [{ bookId: 1, quantity: 2 }],
    };

    it("hợp lệ khi đủ địa chỉ giao hàng và danh sách sản phẩm", async () => {
        expect(await errorsOf(OrderCreaterRequest, validPayload)).toHaveLength(0);
    });

    it("báo lỗi khi thiếu shippingAddress hoặc ngắn hơn 10 ký tự", async () => {
        expect(await errorsOf(OrderCreaterRequest, { ...validPayload, shippingAddress: "Ngan" })).toContain("shippingAddress");
    });

    it("báo lỗi khi orderItems không phải mảng", async () => {
        expect(await errorsOf(OrderCreaterRequest, { ...validPayload, orderItems: "not-an-array" })).toContain("orderItems");
    });
});

describe("OrderUpdateStatusRequest DTO", () => {
    // Sử dụng trực tiếp danh sách giá trị từ Enum OrderStatus của Prisma
    const validStatuses = Object.values(OrderStatus);

    it.each(validStatuses)("chấp nhận trạng thái hợp lệ %s", async (status) => {
        expect(await errorsOf(OrderUpdateStatusRequest, { status })).toHaveLength(0);
    });

    it("báo lỗi khi thiếu status", async () => {
        expect(await errorsOf(OrderUpdateStatusRequest, {})).toContain("status");
    });

    it("báo lỗi khi status không thuộc danh sách cho phép", async () => {
        expect(await errorsOf(OrderUpdateStatusRequest, { status: "INVALID_STATUS" })).toContain("status");
    });
});