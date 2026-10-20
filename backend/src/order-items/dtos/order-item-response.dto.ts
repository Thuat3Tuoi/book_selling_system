import type { OrderItem } from "../../generated/prisma/client.js";
import { ApiProperty } from "@nestjs/swagger";

export class OrderItemResponseDto {
    @ApiProperty()
    readonly id: number;
    @ApiProperty()
    readonly orderId: number;
    @ApiProperty()
    readonly bookId: number;
    @ApiProperty()
    readonly unitPrice: string;
    @ApiProperty()
    readonly quantity: number;
    @ApiProperty()
    readonly totalPrice: string;
    @ApiProperty({ required: false, type: Object, example: { id: 1, title: "Example" } })
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
