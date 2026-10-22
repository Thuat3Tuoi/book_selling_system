import { Test, TestingModule } from "@nestjs/testing";
import { BooksService } from "./books.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { BookSearchSyncService } from "../search/book-search-sync.service.js";
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
    status: "ACTIVE",
    ...overrides,
});

describe("BooksService", () => {
    let service: BooksService;

    const prisma = {
        $transaction: vi.fn(),
        outboxEvent: { create: vi.fn() },
        book: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            count: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
    };
    const redis = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        deleteByPrefix: vi.fn(),
        getRevision: vi.fn(),
        incrementRevision: vi.fn(),
    };
    const searchSync = { enqueue: vi.fn() };

    beforeEach(async () => {
        vi.resetAllMocks();
        redis.getRevision.mockResolvedValue(0);
        prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BooksService,
                { provide: PrismaService, useValue: prisma },
                { provide: RedisService, useValue: redis },
                { provide: BookSearchSyncService, useValue: searchSync },
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

        it("tạo sách ACTIVE và outbox trong cùng transaction, rồi xóa cache", async () => {
            const created = makeBook();
            prisma.book.create.mockResolvedValue(created);

            const result = await service.createBook(dto);

            expect(result).toBe(created);
            expect(prisma.book.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ title: dto.title, isbn: dto.isbn, status: "ACTIVE" }),
            });
            expect(prisma.outboxEvent.create).toHaveBeenCalledWith({ data: { topic: "book.changed", payload: { bookId: 1 } } });
            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, 1);
            expect(redis.incrementRevision).toHaveBeenCalledWith("books:revision");
        });

        it("rollback thao tác sách khi không thể ghi outbox", async () => {
            prisma.book.create.mockResolvedValue(makeBook());
            prisma.outboxEvent.create.mockRejectedValue(new Error("DB error"));
            await expect(service.createBook(dto)).rejects.toThrow("DB error");
            expect(redis.incrementRevision).not.toHaveBeenCalled();
        });

        it("không xác nhận thao tác khi không thể lưu yêu cầu đồng bộ tìm kiếm", async () => {
            prisma.book.create.mockResolvedValue(makeBook());
            searchSync.enqueue.mockRejectedValue(new Error("DB sync queue error"));

            await expect(service.createBook(dto)).rejects.toThrow("DB sync queue error");
            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, 1);
            expect(redis.incrementRevision).not.toHaveBeenCalled();
        });
    });

    describe("getBooks", () => {
        it("cache hit: trả dữ liệu từ Redis, không truy vấn PostgreSQL", async () => {
            const cached = { data: [makeBook()], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } };
            redis.get.mockResolvedValue(cached);

            const result = await service.getBooks(1, 10);

            expect(result).toBe(cached);
            expect(redis.get).toHaveBeenCalledWith("books:page:1:limit:10:rev:0");
            expect(prisma.book.findMany).not.toHaveBeenCalled();
        });

        it("cache miss: đọc DB, tính phân trang và lưu cache 300 giây", async () => {
            redis.get.mockResolvedValue(null);
            prisma.book.findMany.mockResolvedValue([makeBook()]);
            prisma.book.count.mockResolvedValue(25);

            const result = await service.getBooks(2, 10) as any;

            expect(prisma.book.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { status: "ACTIVE" }, skip: 10, take: 10 })
            );
            expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
            expect(redis.set).toHaveBeenCalledWith("books:page:2:limit:10:rev:0", result, 300);
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
            expect(redis.set).toHaveBeenCalledWith("book:1:rev:0", book, 300);
        });

        it("ném NotFoundException khi sách không tồn tại", async () => {
            redis.get.mockResolvedValue(null);
            prisma.book.findUnique.mockResolvedValue(null);

            await expect(service.getBookById(999)).rejects.toBeInstanceOf(NotFoundException);
        });

        it("ném NotFoundException khi sách đã INACTIVE và không lưu cache", async () => {
            redis.get.mockResolvedValue(null);
            prisma.book.findUnique.mockResolvedValue(makeBook({ status: "INACTIVE" }));

            await expect(service.getBookById(1)).rejects.toBeInstanceOf(NotFoundException);
            expect(redis.set).not.toHaveBeenCalled();
        });
    });

    describe("updateBook", () => {
        beforeEach(() => {
            // Giả lập cache HIT cho getBookById khi gọi bên trong updateBook
            redis.get.mockResolvedValue(makeBook());
        });

        it("cập nhật sách ACTIVE: ghi sự kiện và xóa cache", async () => {
            const updated = makeBook({ title: "Clean Code 2nd" });
            prisma.book.update.mockResolvedValue(updated);

            await expect(service.updateBook(1, { title: "Clean Code 2nd" })).resolves.toBe(updated);

            expect(prisma.outboxEvent.create).toHaveBeenCalledWith({ data: { topic: "book.changed", payload: { bookId: 1 } } });
            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, 1);
            expect(redis.incrementRevision).toHaveBeenCalledWith("book:1:revision");
            expect(redis.incrementRevision).toHaveBeenCalledWith("books:revision");
        });

        it("chuyển sang INACTIVE: gửi sự kiện đồng bộ tìm kiếm", async () => {
            const updated = makeBook({ status: "INACTIVE" });
            prisma.book.update.mockResolvedValue(updated);

            await service.updateBook(1, { status: "INACTIVE" });

            expect(prisma.outboxEvent.create).toHaveBeenCalledWith({ data: { topic: "book.changed", payload: { bookId: 1 } } });
            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, 1);
        });

        it("ném NotFoundException khi cập nhật sách không tồn tại", async () => {
            redis.get.mockResolvedValue(null);
            prisma.book.findUnique.mockResolvedValue(null);

            await expect(service.updateBook(999, { title: "x" })).rejects.toBeInstanceOf(NotFoundException);
            expect(prisma.book.update).not.toHaveBeenCalled();
        });
    });

    describe("deleteBook", () => {
        it("xóa mềm: đặt status INACTIVE, ghi outbox và xóa cache", async () => {
            redis.get.mockResolvedValue(makeBook());
            prisma.book.update.mockResolvedValue(makeBook({ status: "INACTIVE" }));

            const result = await service.deleteBook(1);

            expect(prisma.book.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { status: "INACTIVE" },
            });
            expect(result.status).toBe("INACTIVE");
            expect(prisma.outboxEvent.create).toHaveBeenCalledWith({ data: { topic: "book.changed", payload: { bookId: 1 } } });
            expect(searchSync.enqueue).toHaveBeenCalledWith(prisma, 1);
            expect(redis.incrementRevision).toHaveBeenCalledWith("book:1:revision");
        });
    });

    describe("reduceBookStock", () => {
        const tx = prisma as never;

        it("trừ kho bằng một câu UPDATE có điều kiện đủ tồn kho", async () => {
            prisma.book.updateMany.mockResolvedValue({ count: 1 });

            await service.reduceBookStock(tx, 1, 3);

            expect(prisma.book.updateMany).toHaveBeenCalledWith({
                where: { id: 1, status: "ACTIVE", stockQuantity: { gte: 3 } },
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
                where: { status: "ACTIVE", stockQuantity: { lte: 10 } },
            });
        });
    });
});
