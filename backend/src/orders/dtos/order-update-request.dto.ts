import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class OrderUpdateRequest {
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    shippingAddress!: string;
}
