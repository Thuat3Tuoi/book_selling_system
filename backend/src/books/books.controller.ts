import { Controller, Post, Body, Get, Param, ParseIntPipe, Patch, Delete, UseGuards, Query } from "@nestjs/common";
import { BooksService } from "./books.service.js";
import { CreateBookDto } from "./dtos/book-create-request.dto.js";
import { UpdateBookDto } from "./dtos/book-update-request.dto.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

@Controller("books")
export class BooksController {
    constructor(private readonly booksService: BooksService) {}

    @Post()
    createBook(@Body() createBookDto: CreateBookDto) {
        return this.booksService.createBook(createBookDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    getBooks(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
    ) {
        const currentPage = Number(page) || 1;
        const currentLimit = Number(limit) || 10;

        return this.booksService.getBooks(
            currentPage,
            currentLimit,
        );
    }

    @Get(":id")
    getBookById(@Param("id", ParseIntPipe) id: number) {
        return this.booksService.getBookById(id);
    }

    @Patch(":id")
    updateBook(@Param("id", ParseIntPipe) id: number, @Body() updateBookDto: UpdateBookDto) {
        return this.booksService.updateBook(id, updateBookDto);
    }

    @Delete(":id")
    deleteBook(@Param("id", ParseIntPipe) id: number) {
        return this.booksService.deleteBook(id);
    }
}