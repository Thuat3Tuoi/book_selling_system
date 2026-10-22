import { Controller, Post, Body, Get, Param, ParseIntPipe, Patch, Delete, UseGuards, Query } from "@nestjs/common";
import { BooksService } from "./books.service.js";
import { CreateBookDto } from "./dtos/book-create-request.dto.js";
import { UpdateBookDto } from "./dtos/book-update-request.dto.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { RolesGuard } from "../guards/roles.guard.js";
import { Roles } from "../guards/roles.decorator.js";
import { BooksQueryDto } from "./dtos/books-query.dto.js";
import { BookResponseDto } from "./dtos/book-response.dto.js";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ApiEnvelopeResponse } from "../common/api-envelope.decorator.js";

@ApiTags("Books")
@Controller("books")
export class BooksController {
    constructor(private readonly booksService: BooksService) {}

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("ADMIN", "STAFF")
    @ApiBearerAuth()
    @ApiOperation({ summary: "Create a book (ADMIN or STAFF)" })
    @ApiEnvelopeResponse(201, BookResponseDto)
    async createBook(@Body() createBookDto: CreateBookDto) {
        return new BookResponseDto(await this.booksService.createBook(createBookDto));
    }

    @Get()
    @ApiOperation({ summary: "List active books with pagination" })
    @ApiEnvelopeResponse(200, BookResponseDto, { paginated: true })
    async getBooks(@Query() query: BooksQueryDto) {
        const page = await this.booksService.getBooks(query.page ?? 1, query.limit ?? 10);
        return { data: page.data.map((book) => new BookResponseDto(book)), meta: page.meta };
    }

    @Get(":id")
    @ApiParam({ name: "id", type: Number })
    @ApiEnvelopeResponse(200, BookResponseDto)
    async getBookById(@Param("id", ParseIntPipe) id: number) {
        return new BookResponseDto(await this.booksService.getBookById(id));
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("ADMIN", "STAFF")
    @ApiBearerAuth()
    @ApiParam({ name: "id", type: Number })
    @ApiEnvelopeResponse(200, BookResponseDto)
    async updateBook(@Param("id", ParseIntPipe) id: number, @Body() updateBookDto: UpdateBookDto) {
        return new BookResponseDto(await this.booksService.updateBook(id, updateBookDto));
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("ADMIN", "STAFF")
    @ApiBearerAuth()
    @ApiParam({ name: "id", type: Number })
    @ApiEnvelopeResponse(200, BookResponseDto)
    async deleteBook(@Param("id", ParseIntPipe) id: number) {
        return new BookResponseDto(await this.booksService.deleteBook(id));
    }
}
