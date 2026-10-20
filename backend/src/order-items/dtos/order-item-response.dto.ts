import type { OrderItem } from "../../generated/prisma/client.js";

export class OrderItemResponseDto {
    readonly id: number;
    readonly orderId: number;
    readonly bookId: number;
    readonly unitPrice: string;
    readonly quantity: number;
    readonly totalPrice: string;
    readonly book?: { id: number; title: string };

    constructor(item: OrderItem & { book?: { id: number; title: string } }) {
        this.id = item.id;
        this.orderId = item.orderId;
        this.bookId = item.bookId;
        this.unitPrice = String(item.unitPrice);
        this.quantity = item.quantity;
        this.totalPrice = String(item.totalPrice);
        if (item.book) this.book = { id: item.book.id, title: item.book.title };
    }
}
