import { IsEnum } from "class-validator";
import { OrderStatus, type OrderStatus as OrderStatusType } from "../../generated/prisma/enums.js";
import { ApiProperty } from "@nestjs/swagger";
export class OrderUpdateStatusRequest {
    @IsEnum(OrderStatus)
    @ApiProperty({ enum: OrderStatus })
    status!: OrderStatusType;
}
