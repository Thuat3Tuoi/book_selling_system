import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateBookDto } from "./dtos/book-create-request.dto.js";
import { Prisma, type Book } from "../generated/prisma/client.js";
import type { UpdateBookDto } from "./dtos/book-update-request.dto.js";

@Injectable()
export class BooksService {
    constructor(private prismaService: PrismaService) {}

    createBook = async (createBookDto: CreateBookDto): Promise<Book> => {
        return this.prismaService.book.create({
            data: {
                ...createBookDto,
                price: new Prisma.Decimal(createBookDto.price),
                status: "ACTIVE",
            },
        });
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

        return this.prismaService.book.update({
            where: { id: bookId },
            data,
        });
    };

    deleteBook = async (bookId: number): Promise<Book> => {
        await this.getBookById(bookId);

        return this.prismaService.book.update({
            where: { id: bookId },
            data: {
                status: "INACTIVE",
            },
        });
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
}
