import { IsString, MinLength } from "class-validator";
export class OrderUpdateRequest {
    @IsString() @MinLength(10)
    shippingAddress!: string;
}
