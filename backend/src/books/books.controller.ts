import { Controller, Post, Body, Get, Param, ParseIntPipe, Patch, Delete } from "@nestjs/common";
import { BooksService } from "./books.service.js";
import type { CreateBookDto } from "./dtos/book-create-request.dto.js";
import type { UpdateBookDto } from "./dtos/book-update-request.dto.js";

@Controller("books")
export class BooksController {
    constructor(private readonly booksService: BooksService) {}

    @Post()
    createBook(@Body() createBookDto: CreateBookDto) {
        return this.booksService.createBook(createBookDto);
    }

    @Get()
    getBooks() {
        return this.booksService.getBooks();
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
