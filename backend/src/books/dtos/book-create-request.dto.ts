import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateBookDto {
    @ApiProperty() @IsNotEmpty() @IsString() title: string;
    @ApiProperty() @IsNotEmpty() @IsString() isbn: string;
    @ApiProperty() @IsNotEmpty() @IsString() description: string;
    @ApiProperty() @IsNotEmpty() @IsString() author: string;
    @ApiProperty() @IsNotEmpty() @IsString() category: string;
    @ApiProperty({ minimum: 0 }) @IsNotEmpty() @IsNumber() @Min(0) price: number;
    @ApiProperty({ minimum: 0, type: Number }) @IsNotEmpty() @IsInt() @Min(0) stockQuantity: number;
    @ApiProperty({ format: "uri" }) @IsNotEmpty() @IsString() coverImageUrl: string;
}
