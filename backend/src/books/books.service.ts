import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateBookDto } from "./dtos/book-create-request.dto.js";
import { Prisma, type Book } from "../generated/prisma/client.js";
import type { UpdateBookDto } from "./dtos/book-update-request.dto.js";
import { RedisService } from "../redis/redis.service.js";
import { BookSearchSyncService } from "../search/book-search-sync.service.js";

export interface BooksPage {
    data: Book[];
    meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class BooksService {
    private readonly logger = new Logger(BooksService.name);

    // Cache tồn tại 5 phút
    private readonly CACHE_TTL = 300;

    constructor(
        private readonly prismaService: PrismaService,
        private readonly redis: RedisService,
        private readonly searchSync: BookSearchSyncService,
    ) {}

    // =========================
    // CREATE BOOK
    // =========================

    createBook = async (createBookDto: CreateBookDto): Promise<Book> => {
        const book = await this.prismaService.$transaction(async (tx) => {
            const created = await tx.book.create({
                data: {
                title: createBookDto.title,
                isbn: createBookDto.isbn,
                description: createBookDto.description,
                author: createBookDto.author,
                category: createBookDto.category,
                stockQuantity: createBookDto.stockQuantity,
                coverImageUrl: createBookDto.coverImageUrl,
                price: new Prisma.Decimal(createBookDto.price),
                status: "ACTIVE",
                },
            });
            await tx.outboxEvent.create({ data: { topic: "book.changed", payload: { bookId: created.id } } });
            await this.searchSync.enqueue(tx, created.id);
            return created;
        });
        await this.invalidateBookCaches(book.id);

        return book;
    };

    // =========================
    // GET ALL BOOKS
    // =========================

    getBooks = async (page = 1, limit = 10): Promise<BooksPage> => {
        const skip = (page - 1) * limit;
        const revision = await this.redis.getRevision("books:revision");
        const cacheKey = `books:page:${page}:limit:${limit}:rev:${revision}`;

        // 1. Kiểm tra Redis
        const cachedBooks = revision === null ? null : await this.redis.get<BooksPage>(cacheKey);

        if (cachedBooks) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cachedBooks;
        }

        this.logger.log(`CACHE MISS: ${cacheKey}`);

        // 2. Lấy dữ liệu từ PostgreSQL
        const [books, total] = await Promise.all([
            this.prismaService.book.findMany({
                where: {
                    status: "ACTIVE",
                },
                skip,
                take: limit,
                orderBy: {
                    id: "desc",
                },
            }),
            this.prismaService.book.count({
                where: {
                    status: "ACTIVE",
                },
            }),
        ]);

        // 3. Tạo response
        const result = {
            data: books,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };

        // 4. Lưu Redis trong 5 phút
        if (revision !== null) await this.redis.set(cacheKey, result, this.CACHE_TTL);

        return result;
    };

    // =========================
    // GET BOOK BY ID
    // =========================

    getBookById = async (bookId: number): Promise<Book> => {
        const revision = await this.redis.getRevision(`book:${bookId}:revision`);
        const cacheKey = `book:${bookId}:rev:${revision}`;

        // 1. Kiểm tra Redis
        const cachedBook = revision === null ? null : await this.redis.get<Book>(cacheKey);

        if (cachedBook) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cachedBook;
        }

        this.logger.log(`CACHE MISS: ${cacheKey}`);

        // 2. Không có cache → lấy PostgreSQL
        const book = await this.prismaService.book.findUnique({
            where: {
                id: bookId,
            },
        });

        if (!book || book.status !== "ACTIVE") {
            throw new NotFoundException("Không tìm thấy sách");
        }

        // 3. Lưu Redis
        if (revision !== null) await this.redis.set(cacheKey, book, this.CACHE_TTL);

        return book;
    };

    // =========================
    // UPDATE BOOK
    // =========================

    updateBook = async (bookId: number, updateBookDto: UpdateBookDto): Promise<Book> => {
        // Kiểm tra sách tồn tại
        await this.getBookById(bookId);

        const data: Prisma.BookUpdateInput = {
            title: updateBookDto.title,
            isbn: updateBookDto.isbn,
            description: updateBookDto.description,
            author: updateBookDto.author,
            category: updateBookDto.category,
            stockQuantity: updateBookDto.stockQuantity,
            coverImageUrl: updateBookDto.coverImageUrl,
            status: updateBookDto.status,
            price: updateBookDto.price === undefined ? undefined : new Prisma.Decimal(updateBookDto.price),
        };

        const book = await this.prismaService.$transaction(async (tx) => {
            const updated = await tx.book.update({ where: { id: bookId }, data });
            await tx.outboxEvent.create({ data: { topic: "book.changed", payload: { bookId } } });
            await this.searchSync.enqueue(tx, bookId);
            return updated;
        });
        await this.invalidateBookCaches(bookId);

        return book;
    };

    // =========================
    // DELETE BOOK
    // =========================

    deleteBook = async (bookId: number): Promise<Book> => {
        await this.getBookById(bookId);

        const book = await this.prismaService.$transaction(async (tx) => {
            const updated = await tx.book.update({
                where: { id: bookId },
                data: { status: "INACTIVE" },
            });
            await tx.outboxEvent.create({ data: { topic: "book.changed", payload: { bookId } } });
            await this.searchSync.enqueue(tx, bookId);
            return updated;
        });
        await this.invalidateBookCaches(bookId);

        return book;
    };

    // =========================
    // REDUCE STOCK
    // =========================

    reduceBookStock = async (tx: Prisma.TransactionClient, bookId: number, quantity: number) => {
        const result = await tx.book.updateMany({
            where: {
                id: bookId,
                status: "ACTIVE",
                stockQuantity: { gte: quantity },
            },
            data: {
                stockQuantity: {
                    decrement: quantity,
                },
            },
        });

        if (result.count === 0) {
            throw new BadRequestException(`Sách ${bookId} không đủ tồn kho hoặc không còn hoạt động.`);
        }

    };

    invalidateBookCaches = async (bookId: number): Promise<void> => {
        await this.redis.incrementRevision(`book:${bookId}:revision`);
        await this.redis.incrementRevision("books:revision");
        // Giỏ hàng cache thông tin sách kèm theo; giá, trạng thái và tồn kho có thể đã đổi.
        await this.redis.incrementRevision("cart:catalog:revision");
    };

    // =========================
    // LOW STOCK
    // =========================

    getLowStockBook = async () => {
        return this.prismaService.book.findMany({
            where: {
                status: "ACTIVE",
                stockQuantity: {
                    lte: 10,
                },
            },
        });
    };

}
