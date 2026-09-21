import { IsEnum } from "class-validator";
import { OrderStatus, type OrderStatus as OrderStatusType } from "../../generated/prisma/enums.js";
export class OrderUpdateStatusRequest {
    @IsEnum(OrderStatus)
    status!: OrderStatusType;
}
