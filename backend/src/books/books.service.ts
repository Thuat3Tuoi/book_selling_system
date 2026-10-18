import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateBookDto } from "./dtos/book-create-request.dto.js";
import { Prisma, type Book } from "../generated/prisma/client.js";
import type { UpdateBookDto } from "./dtos/book-update-request.dto.js";
import { SearchService } from "../search/search.service.js";
import { RedisService } from "../redis/redis.service.js";

@Injectable()
export class BooksService {
    private readonly logger = new Logger(BooksService.name);

    // Cache tồn tại 5 phút
    private readonly CACHE_TTL = 300;

    constructor(
        private readonly prismaService: PrismaService,
        private readonly searchService: SearchService,
        private readonly redis: RedisService
    ) {}

    // =========================
    // CREATE BOOK
    // =========================

    createBook = async (createBookDto: CreateBookDto): Promise<Book> => {
        const book = await this.prismaService.book.create({
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

        await this.syncToSearch(book, "index");

        // Danh sách sách đã thay đổi -> Xóa cache phân trang
        await this.redis.delete("books:list");

        return book;
    };

    // =========================
    // GET ALL BOOKS
    // =========================

    getBooks = async (page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const cacheKey = `books:page:${page}:limit:${limit}`;

        // 1. Kiểm tra Redis
        const cachedBooks = await this.redis.get(cacheKey);

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
        await this.redis.set(cacheKey, result, this.CACHE_TTL);

        return result;
    };

    // =========================
    // GET BOOK BY ID
    // =========================

    getBookById = async (bookId: number): Promise<Book> => {
        const cacheKey = `book:${bookId}`;

        // 1. Kiểm tra Redis
        const cachedBook = await this.redis.get<Book>(cacheKey);

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
        await this.redis.set(cacheKey, book, this.CACHE_TTL);

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

        const book = await this.prismaService.book.update({
            where: {
                id: bookId,
            },
            data,
        });

        // Sách bị chuyển sang INACTIVE thì gỡ khỏi chỉ mục tìm kiếm
        await this.syncToSearch(book, book.status === "ACTIVE" ? "index" : "remove");

        // Xóa cache chi tiết sách
        await this.redis.delete(`book:${bookId}`);

        // Xóa cache danh sách
        await this.redis.delete("books:list");

        return book;
    };

    // =========================
    // DELETE BOOK
    // =========================

    deleteBook = async (bookId: number): Promise<Book> => {
        await this.getBookById(bookId);

        const book = await this.prismaService.book.update({
            where: {
                id: bookId,
            },
            data: {
                status: "INACTIVE",
            },
        });

        await this.syncToSearch(book, "remove");

        // Xóa cache chi tiết
        await this.redis.delete(`book:${bookId}`);

        // Xóa cache danh sách
        await this.redis.delete("books:list");

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

        // Tồn kho thay đổi nên cache chi tiết sách không còn đúng
        await this.redis.delete(`book:${bookId}`);
    };

    // =========================
    // LOW STOCK
    // =========================

    getLowStockBook = async () => {
        return this.prismaService.book.findMany({
            where: {
                stockQuantity: {
                    lte: 10,
                },
            },
        });
    };

    // =========================
    // MEILISEARCH HELPER
    // =========================

    private syncToSearch = async (book: Book, action: "index" | "remove"): Promise<void> => {
        try {
            if (action === "index") {
                await this.searchService.indexBook(book);
            } else {
                await this.searchService.removeBookFromIndex(book.id);
            }
        } catch (error) {
            this.logger.error(
                `Dong bo Meilisearch that bai cho sach id=${book.id}: ${(error as Error).message}`
            );
        }
    };
}