import { IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OrderUpdateRequest {
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @ApiProperty({ minLength: 10 })
    shippingAddress!: string;
}
