import { Controller, Post, Body, Get, Param, ParseIntPipe, Patch, Delete, UseGuards, Query } from "@nestjs/common";
import { BooksService } from "./books.service.js";
import { CreateBookDto } from "./dtos/book-create-request.dto.js";
import { UpdateBookDto } from "./dtos/book-update-request.dto.js";
import { BooksQueryDto } from "./dtos/books-query.dto.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { StaffAuthGuard } from "../guards/staff-auth.guard.js";
import { ApiBearerAuth, ApiForbiddenResponse } from "@nestjs/swagger";

@Controller("books")
export class BooksController {
    constructor(private readonly booksService: BooksService) {}

    @Post()
    @UseGuards(JwtAuthGuard, StaffAuthGuard)
    @ApiBearerAuth()
    @ApiForbiddenResponse({ description: "Requires ADMIN or STAFF" })
    createBook(@Body() createBookDto: CreateBookDto) {
        return this.booksService.createBook(createBookDto);
    }

    @Get()
    getBooks(@Query() query: BooksQueryDto) {
        return this.booksService.getBooks(query.page, query.limit);
    }

    @Get(":id")
    getBookById(@Param("id", ParseIntPipe) id: number) {
        return this.booksService.getBookById(id);
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard, StaffAuthGuard)
    @ApiBearerAuth()
    @ApiForbiddenResponse({ description: "Requires ADMIN or STAFF" })
    updateBook(@Param("id", ParseIntPipe) id: number, @Body() updateBookDto: UpdateBookDto) {
        return this.booksService.updateBook(id, updateBookDto);
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard, StaffAuthGuard)
    @ApiBearerAuth()
    @ApiForbiddenResponse({ description: "Requires ADMIN or STAFF" })
    deleteBook(@Param("id", ParseIntPipe) id: number) {
        return this.booksService.deleteBook(id);
    }
}
