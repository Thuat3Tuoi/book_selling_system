import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class CreateBookDto {
    @IsNotEmpty() @IsString() title: string;
    @IsNotEmpty() @IsString() isbn: string;
    @IsNotEmpty() @IsString() description: string;
    @IsNotEmpty() @IsString() author: string;
    @IsNotEmpty() @IsString() category: string;
    @IsNotEmpty() @IsNumber() @Min(0) price: number;
    @IsNotEmpty() @IsInt() @Min(0) stockQuantity: number;
    @IsNotEmpty() @IsString() coverImageUrl: string;
}