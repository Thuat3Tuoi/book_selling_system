import type { Order, OrderItem } from "../../generated/prisma/client.js";
import { OrderItemResponseDto } from "../../order-items/dtos/order-item-response.dto.js";
import { ApiProperty } from "@nestjs/swagger";

export class OrderResponseDto {
    @ApiProperty()
    readonly id: number;
    @ApiProperty()
    readonly userId: number;
    @ApiProperty({ description: "Decimal amount serialized as a string" })
    readonly totalAmount: string;
    @ApiProperty()
    readonly shippingAddress: string;
    @ApiProperty()
    readonly status: string;
    @ApiProperty({ type: String, format: "date-time" })
    readonly createdAt: Date;
    @ApiProperty({ type: () => [OrderItemResponseDto] })
    readonly orderItems: OrderItemResponseDto[];

    constructor(order: Order & { orderItems?: (OrderItem & { book?: { id: number; title: string } })[] }) {
        this.id = order.id;
        this.userId = order.userId;
        this.totalAmount = String(order.totalAmount);
        this.shippingAddress = order.shippingAddress;
        this.status = order.status;
        this.createdAt = order.createdAt;
        this.orderItems = (order.orderItems ?? []).map((item) => new OrderItemResponseDto(item));
    }
}
