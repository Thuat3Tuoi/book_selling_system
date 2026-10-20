import { IsInt, IsNotEmpty, IsPositive, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddToCartDto {
    @IsNotEmpty()
    @IsInt()
    @IsPositive()
    @ApiProperty({ minimum: 1 })
    bookId: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @ApiProperty({ minimum: 1 })
    quantity: number;
}
