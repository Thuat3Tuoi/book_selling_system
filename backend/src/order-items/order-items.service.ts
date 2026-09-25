import { Injectable, NotFoundException } from "@nestjs/common";
import type { OrderItem } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class OrderItemsService {
    constructor(private prismaService: PrismaService) {}

    getOrderItemsById = async (orderItemId: number): Promise<OrderItem> => {
        const orderItem = await this.prismaService.orderItem.findUnique({
            where: {
                id: orderItemId,
            },
        });

        if (!orderItem) {
            throw new NotFoundException("Order-item not found!");
        }

        return orderItem;
    };

    getOrderItems = async (): Promise<OrderItem[]> => {
        return this.prismaService.orderItem.findMany();
    };
}
