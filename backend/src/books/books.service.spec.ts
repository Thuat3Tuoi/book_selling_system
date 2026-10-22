import { Test, TestingModule } from "@nestjs/testing";
import { BooksService } from "./books.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BookSearchSyncService } from "../search/book-search-sync.service.js";
import { BookStatus } from "../generated/prisma/enums.js";
import { RedisService } from "../redis/redis.service.js";
import { BadRequestException, NotFoundException } from "@nestjs/common";

vi.mock("../generated/prisma/client.js", () => ({
    PrismaClient: class {},
    Prisma: {
        Decimal: class {
            constructor(public value: unknown) {}
        },
    },
}));

const makeBook = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    title: "Clean Code",
    isbn: "9780132350884",
    description: "A handbook of agile software craftsmanship",
    author: "Robert C. Martin",
    category: "Programming",
    price: 150000,
    stockQuantity: 20,
    coverImageUrl: "https://example.com/clean-code.jpg",
    status: BookStatus.ACTIVE,
    ...overrides,
});

describe("BooksService", () => {
    let service: BooksService;

    const prisma = {
        $transaction: vi.fn(),
        book: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            count: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
    };
    const searchSync = {
        enqueue: vi.fn(),
        syncNow: vi.fn(),
    };
    const redis = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        deleteByPattern: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) => callback(prisma));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BooksService,
                { provide: PrismaService, useValue: prisma },
                { provide: BookSearchSyncService, useValue: searchSync },
                { provide: RedisService, useValue: redis },
            ],
        }).compile();

        service = module.get<BooksService>(BooksService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("createBook", () => {
        const dto = {
            title: "Clean Code",
            isbn: "9780132350884",
            description: "desc",
            author: "Robert C. Martin",
            category: "Programming",
            price: 150000,
            stockQuantity: 20,
            coverImageUrl: "https://example.com/a.jpg",
        };

        it("tạo sách ACTIVE, đồng bộ Meilisearch và xóa cache danh sách", async () => {
            const created = makeBook();
            prisma.book.create.mockResolvedValue(created);

            const result = await service.createBook(dto);

            expect(result).toBe(created);
            expect(prisma.book.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ title: dto.title, isbn: dto.isbn, status: BookStatus.ACTIVE }),
            });
            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, created.id);
            expect(searchSync.syncNow).toHaveBeenCalledWith(created.id);
            expect(redis.deleteByPattern).toHaveBeenCalledWith("books:page:*");
        });

        it("vẫn tạo được sách khi Meilisearch bị lỗi", async () => {
            const created = makeBook();
            prisma.book.create.mockResolvedValue(created);
            searchSync.syncNow.mockRejectedValue(new Error("Meilisearch down"));

            await expect(service.createBook(dto)).resolves.toBe(created);
            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, created.id);
        });
    });

    describe("getBooks", () => {
        it("cache hit: trả dữ liệu từ Redis, không truy vấn PostgreSQL", async () => {
            const cached = { data: [makeBook()], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } };
            redis.get.mockResolvedValue(cached);

            const result = await service.getBooks(1, 10);

            expect(result).toBe(cached);
            expect(redis.get).toHaveBeenCalledWith("books:page:1:limit:10");
            expect(prisma.book.findMany).not.toHaveBeenCalled();
        });

        it("cache miss: đọc DB, tính phân trang và lưu cache 300 giây", async () => {
            redis.get.mockResolvedValue(null);
            prisma.book.findMany.mockResolvedValue([makeBook()]);
            prisma.book.count.mockResolvedValue(25);

            const result = await service.getBooks(2, 10) as any;

            expect(prisma.book.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { status: BookStatus.ACTIVE }, skip: 10, take: 10 })
            );
            expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
            expect(redis.set).toHaveBeenCalledWith("books:page:2:limit:10", result, 300);
        });
    });

    describe("getBookById", () => {
        it("cache hit: trả sách từ Redis", async () => {
            const book = makeBook();
            redis.get.mockResolvedValue(book);

            await expect(service.getBookById(1)).resolves.toBe(book);
            expect(prisma.book.findUnique).not.toHaveBeenCalled();
        });

        it("cache miss: đọc DB rồi lưu cache", async () => {
            const book = makeBook();
            redis.get.mockResolvedValue(null);
            prisma.book.findUnique.mockResolvedValue(book);

            await expect(service.getBookById(1)).resolves.toBe(book);
            expect(redis.set).toHaveBeenCalledWith("book:1", book, 300);
        });

        it("ném NotFoundException khi sách không tồn tại", async () => {
            redis.get.mockResolvedValue(null);
            prisma.book.findUnique.mockResolvedValue(null);

            await expect(service.getBookById(999)).rejects.toBeInstanceOf(NotFoundException);
        });

        it("ném NotFoundException khi sách đã INACTIVE và không lưu cache", async () => {
            redis.get.mockResolvedValue(null);
            prisma.book.findUnique.mockResolvedValue(makeBook({ status: BookStatus.INACTIVE }));

            await expect(service.getBookById(1)).rejects.toBeInstanceOf(NotFoundException);
            expect(redis.set).not.toHaveBeenCalled();
        });
    });

    describe("updateBook", () => {
        beforeEach(() => {
            // Giả lập cache HIT cho getBookById khi gọi bên trong updateBook
            redis.get.mockResolvedValue(makeBook());
        });

        it("cập nhật sách ACTIVE: đánh lại chỉ mục và xóa cache", async () => {
            const updated = makeBook({ title: "Clean Code 2nd" });
            prisma.book.update.mockResolvedValue(updated);

            await expect(service.updateBook(1, { title: "Clean Code 2nd" })).resolves.toBe(updated);

            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, updated.id);
            expect(searchSync.syncNow).toHaveBeenCalledWith(updated.id);
            expect(redis.delete).toHaveBeenCalledWith("book:1");
            expect(redis.deleteByPattern).toHaveBeenCalledWith("books:page:*");
        });

        it("chuyển sang INACTIVE: gỡ sách khỏi chỉ mục tìm kiếm", async () => {
            const updated = makeBook({ status: BookStatus.INACTIVE });
            prisma.book.update.mockResolvedValue(updated);

            await service.updateBook(1, { status: BookStatus.INACTIVE });

            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, 1);
            expect(searchSync.syncNow).toHaveBeenCalledWith(1);
        });

        it("ném NotFoundException khi cập nhật sách không tồn tại", async () => {
            redis.get.mockResolvedValue(null);
            prisma.book.findUnique.mockResolvedValue(null);

            await expect(service.updateBook(999, { title: "x" })).rejects.toBeInstanceOf(NotFoundException);
            expect(prisma.book.update).not.toHaveBeenCalled();
        });
    });

    describe("deleteBook", () => {
        it("xóa mềm: đặt status INACTIVE, gỡ khỏi chỉ mục và xóa cache", async () => {
            redis.get.mockResolvedValue(makeBook());
            prisma.book.update.mockResolvedValue(makeBook({ status: BookStatus.INACTIVE }));

            const result = await service.deleteBook(1);

            expect(prisma.book.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { status: BookStatus.INACTIVE },
            });
            expect(result.status).toBe(BookStatus.INACTIVE);
            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, 1);
            expect(searchSync.syncNow).toHaveBeenCalledWith(1);
            expect(redis.delete).toHaveBeenCalledWith("book:1");
        });
    });

    describe("reduceBookStock", () => {
        const tx = prisma as never;

        it("trừ kho bằng một câu UPDATE có điều kiện đủ tồn kho", async () => {
            prisma.book.updateMany.mockResolvedValue({ count: 1 });

            await service.reduceBookStock(tx, 1, 3);

            expect(prisma.book.updateMany).toHaveBeenCalledWith({
                where: { id: 1, status: BookStatus.ACTIVE, stockQuantity: { gte: 3 } },
                data: { stockQuantity: { decrement: 3 } },
            });
            expect(redis.delete).not.toHaveBeenCalled();
        });

        it("ném BadRequestException khi không đủ tồn kho (không làm tồn kho âm)", async () => {
            prisma.book.updateMany.mockResolvedValue({ count: 0 });

            await expect(service.reduceBookStock(tx, 1, 999)).rejects.toBeInstanceOf(BadRequestException);
            expect(redis.delete).not.toHaveBeenCalled();
        });
    });

    describe("getLowStockBook", () => {
        it("lọc sách có tồn kho từ 10 trở xuống", async () => {
            prisma.book.findMany.mockResolvedValue([makeBook({ stockQuantity: 3 })]);

            await service.getLowStockBook();

            expect(prisma.book.findMany).toHaveBeenCalledWith({
                where: { status: BookStatus.ACTIVE, stockQuantity: { lte: 10 } },
            });
        });
    });
});
