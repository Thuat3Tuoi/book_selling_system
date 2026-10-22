import type { Book } from "../../generated/prisma/client.js";
import { ApiProperty } from "@nestjs/swagger";

export class BookResponseDto {
    @ApiProperty()
    readonly id: number;
    @ApiProperty()
    readonly title: string;
    @ApiProperty()
    readonly isbn: string;
    @ApiProperty()
    readonly description: string;
    @ApiProperty()
    readonly author: string;
    @ApiProperty()
    readonly category: string;
    @ApiProperty({ description: "Decimal amount serialized as a string" })
    readonly price: string;
    @ApiProperty()
    readonly stockQuantity: number;
    @ApiProperty()
    readonly coverImageUrl: string;
    @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
    readonly status: string;
    @ApiProperty({ type: String, format: "date-time" })
    readonly createdAt: Date;
    @ApiProperty({ type: String, format: "date-time" })
    readonly updatedAt: Date;

    constructor(book: Book) {
        this.id = book.id;
        this.title = book.title;
        this.isbn = book.isbn;
        this.description = book.description;
        this.author = book.author;
        this.category = book.category;
        this.price = String(book.price);
        this.stockQuantity = book.stockQuantity;
        this.coverImageUrl = book.coverImageUrl;
        this.status = book.status;
        this.createdAt = book.createdAt;
        this.updatedAt = book.updatedAt;
    }
}
