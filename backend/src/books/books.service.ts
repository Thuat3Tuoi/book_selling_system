import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateBookDto } from "./dtos/book-create-request.dto.js";
import { Prisma, type Book } from "../generated/prisma/client.js";
import type { UpdateBookDto } from "./dtos/book-update-request.dto.js";
import { SearchService } from "../search/search.service.js";
import type { Decimal } from "@prisma/client/runtime/client";

@Injectable()
export class BooksService {
    private readonly logger = new Logger(BooksService.name);

    constructor(
        private prismaService: PrismaService,
        private searchService: SearchService,
    ) {}

    createBook = async (createBookDto: CreateBookDto): Promise<Book> => {
        const book = await this.prismaService.book.create({
            data: {
                ...createBookDto,
                price: new Prisma.Decimal(createBookDto.price),
                status: "ACTIVE",
            },
        });
        await this.syncToSearch(book, "index");

        return book;
    };

    getBooks = async (): Promise<Book[]> => {
        return this.prismaService.book.findMany({
            where: {
                status: "ACTIVE",
            },
        });
    };

    getBookById = async (bookId: number): Promise<Book> => {
        const book = await this.prismaService.book.findUnique({
            where: { id: bookId },
        });

        if (!book || book.status !== "ACTIVE") {
            throw new NotFoundException("Không tìm thấy sách");
        }

        return book;
    };

    updateBook = async (bookId: number, updateBookDto: UpdateBookDto): Promise<Book> => {
        await this.getBookById(bookId);

        const data: Prisma.BookUpdateInput = {
            ...updateBookDto,
            ...(updateBookDto.price && {
                price: new Prisma.Decimal(updateBookDto.price),
            }),
        };

        const book = await this.prismaService.book.update({
            where: { id: bookId },
            data,
        });

        await this.syncToSearch(book, "index");
        return book;
    };

    deleteBook = async (bookId: number): Promise<Book> => {
        await this.getBookById(bookId);

        const book = await this.prismaService.book.update({
            where: { id: bookId },
            data: {
                status: "INACTIVE",
            },
        });

        await this.syncToSearch(book, "remove");
        return book;
    };

    reduceBookStock = async (tx: Prisma.TransactionClient, bookId: number, quantity: number) => {
        return await tx.book.update({
            where: {
                id: bookId,
            },
            data: {
                stockQuantity: {
                    decrement: quantity,
                },
            },
        });
    };

    getLowStockBook = async () => {
        return this.prismaService.book.findMany({
            where: {
                stockQuantity: {
                    lte: 10,
                },
            },
        });
    };

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
