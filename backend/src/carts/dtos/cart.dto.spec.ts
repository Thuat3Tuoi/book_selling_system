import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AddToCartDto } from "./cart-add-request.dto.js";
import { UpdateCartItemDto } from "./cart-update-request.dto.js";

async function errorsOf<T extends object>(cls: new () => T, payload: Record<string, unknown>) {
    const errors = await validate(plainToInstance(cls, payload));
    return errors.map((e) => e.property);
}

describe("AddToCartDto", () => {
    it("hợp lệ khi bookId và quantity là số nguyên dương", async () => {
        expect(await errorsOf(AddToCartDto, { bookId: 1, quantity: 2 })).toHaveLength(0);
    });

    it.each(["bookId", "quantity"])("báo lỗi khi thiếu %s", async (field) => {
        const payload: Record<string, unknown> = { bookId: 1, quantity: 2 };
        delete payload[field];

        expect(await errorsOf(AddToCartDto, payload)).toContain(field);
    });

    it.each(["bookId", "quantity"])("báo lỗi khi %s là chuỗi", async (field) => {
        expect(await errorsOf(AddToCartDto, { bookId: 1, quantity: 2, [field]: "1" })).toContain(field);
    });

    it.each(["bookId", "quantity"])("báo lỗi khi %s không phải số nguyên", async (field) => {
        expect(await errorsOf(AddToCartDto, { bookId: 1, quantity: 2, [field]: 1.5 })).toContain(field);
    });

    it("báo lỗi khi bookId bằng 0 hoặc âm", async () => {
        expect(await errorsOf(AddToCartDto, { bookId: 0, quantity: 1 })).toContain("bookId");
        expect(await errorsOf(AddToCartDto, { bookId: -3, quantity: 1 })).toContain("bookId");
    });

    it("báo lỗi khi quantity nhỏ hơn 1", async () => {
        expect(await errorsOf(AddToCartDto, { bookId: 1, quantity: 0 })).toContain("quantity");
        expect(await errorsOf(AddToCartDto, { bookId: 1, quantity: -1 })).toContain("quantity");
    });
});

describe("UpdateCartItemDto", () => {
    it("hợp lệ khi quantity là số nguyên từ 1 trở lên", async () => {
        expect(await errorsOf(UpdateCartItemDto, { quantity: 3 })).toHaveLength(0);
    });

    it("báo lỗi khi thiếu quantity", async () => {
        expect(await errorsOf(UpdateCartItemDto, {})).toContain("quantity");
    });

    it("báo lỗi khi quantity là chuỗi", async () => {
        expect(await errorsOf(UpdateCartItemDto, { quantity: "3" })).toContain("quantity");
    });

    it("báo lỗi khi quantity nhỏ hơn 1", async () => {
        expect(await errorsOf(UpdateCartItemDto, { quantity: 0 })).toContain("quantity");
    });

    it("báo lỗi khi quantity không phải số nguyên", async () => {
        expect(await errorsOf(UpdateCartItemDto, { quantity: 2.5 })).toContain("quantity");
    });
});