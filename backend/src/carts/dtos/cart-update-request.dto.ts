import { IsNotEmpty, IsInt, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateCartItemDto {
    @ApiProperty({ minimum: 1 }) @IsNotEmpty() @IsInt() @Min(1) quantity: number;
}
