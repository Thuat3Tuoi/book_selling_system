import { IsNotEmpty, MinLength, IsString } from "class-validator";
import type { OrderItem } from "../../generated/prisma/client.js";

export class OrderCreaterRequest {
    userId!: number;

    @IsString()
    @IsNotEmpty({ message: "Địa chỉ không được để trống." })
    @MinLength(10, { message: "Địa chỉ phải ít nhất 10 ký tự." })
    shippingAddress!: string;

    orderItems: OrderItem[];
}
