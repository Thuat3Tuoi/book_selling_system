import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateBookDto } from "./book-create-request.dto.js";
import { UpdateBookDto } from "./book-update-request.dto.js";

const validCreate = {
    title: "Clean Code",
    isbn: "9780132350884",
    description: "A handbook of agile software craftsmanship",
    author: "Robert C. Martin",
    category: "Programming",
    price: 150000,
    stockQuantity: 20,
    coverImageUrl: "https://example.com/clean-code.jpg",
};

async function errorsOf<T extends object>(cls: new () => T, payload: Record<string, unknown>) {
    const errors = await validate(plainToInstance(cls, payload));
    return errors.map((e) => e.property);
}

describe("CreateBookDto", () => {
    describe("payload hợp lệ", () => {
        it("không có lỗi khi đủ và đúng mọi trường", async () => {
            expect(await errorsOf(CreateBookDto, validCreate)).toHaveLength(0);
        });

        it("chấp nhận giá và tồn kho bằng 0", async () => {
            expect(await errorsOf(CreateBookDto, { ...validCreate, price: 0, stockQuantity: 0 })).toHaveLength(0);
        });
    });

    describe("thiếu trường bắt buộc", () => {
        it.each(Object.keys(validCreate))("báo lỗi khi thiếu %s", async (field) => {
            const payload: Record<string, unknown> = { ...validCreate };
            delete payload[field];

            expect(await errorsOf(CreateBookDto, payload)).toContain(field);
        });

        it("báo lỗi cho mọi trường khi body rỗng", async () => {
            expect(await errorsOf(CreateBookDto, {})).toEqual(expect.arrayContaining(Object.keys(validCreate)));
        });
    });

    describe("sai kiểu dữ liệu", () => {
        it.each(["title", "isbn", "description", "author", "category", "coverImageUrl"])(
            "báo lỗi khi %s là số thay vì chuỗi",
            async (field) => {
                expect(await errorsOf(CreateBookDto, { ...validCreate, [field]: 12345 })).toContain(field);
            }
        );

        it("báo lỗi khi price là chuỗi", async () => {
            expect(await errorsOf(CreateBookDto, { ...validCreate, price: "150000" })).toContain("price");
        });

        it("báo lỗi khi stockQuantity là chuỗi", async () => {
            expect(await errorsOf(CreateBookDto, { ...validCreate, stockQuantity: "20" })).toContain(
                "stockQuantity"
            );
        });
    });

    describe("giá trị ngoài miền cho phép", () => {
        it("báo lỗi khi price âm", async () => {
            expect(await errorsOf(CreateBookDto, { ...validCreate, price: -1 })).toContain("price");
        });

        it("báo lỗi khi stockQuantity âm", async () => {
            expect(await errorsOf(CreateBookDto, { ...validCreate, stockQuantity: -5 })).toContain(
                "stockQuantity"
            );
        });

        it("báo lỗi khi stockQuantity không phải số nguyên", async () => {
            expect(await errorsOf(CreateBookDto, { ...validCreate, stockQuantity: 2.5 })).toContain(
                "stockQuantity"
            );
        });
    });
});

describe("UpdateBookDto", () => {
    it("hợp lệ khi body rỗng (mọi trường đều tùy chọn)", async () => {
        expect(await errorsOf(UpdateBookDto, {})).toHaveLength(0);
    });

    it("hợp lệ khi chỉ gửi một trường", async () => {
        expect(await errorsOf(UpdateBookDto, { title: "Clean Code 2nd Edition" })).toHaveLength(0);
    });

    it.each(["ACTIVE", "INACTIVE"])("chấp nhận status %s", async (status) => {
        expect(await errorsOf(UpdateBookDto, { status })).toHaveLength(0);
    });

    it("báo lỗi khi status không thuộc ACTIVE/INACTIVE", async () => {
        expect(await errorsOf(UpdateBookDto, { status: "DELETED" })).toContain("status");
    });

    it("báo lỗi khi title sai kiểu", async () => {
        expect(await errorsOf(UpdateBookDto, { title: 123 })).toContain("title");
    });

    it("báo lỗi khi price âm", async () => {
        expect(await errorsOf(UpdateBookDto, { price: -10 })).toContain("price");
    });

    it("báo lỗi khi stockQuantity âm hoặc không nguyên", async () => {
        expect(await errorsOf(UpdateBookDto, { stockQuantity: -1 })).toContain("stockQuantity");
        expect(await errorsOf(UpdateBookDto, { stockQuantity: 1.5 })).toContain("stockQuantity");
    });
});