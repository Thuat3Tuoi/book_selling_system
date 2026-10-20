import type { Book } from "../../generated/prisma/client.js";

export class BookResponseDto {
    readonly id: number;
    readonly title: string;
    readonly isbn: string;
    readonly description: string;
    readonly author: string;
    readonly category: string;
    readonly price: string;
    readonly stockQuantity: number;
    readonly coverImageUrl: string;
    readonly status: string;
    readonly createdAt: Date;
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
