import type { Order, OrderItem } from "../../generated/prisma/client.js";
import { OrderItemResponseDto } from "../../order-items/dtos/order-item-response.dto.js";

export class OrderResponseDto {
    readonly id: number;
    readonly userId: number;
    readonly totalAmount: string;
    readonly shippingAddress: string;
    readonly status: string;
    readonly createdAt: Date;
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
