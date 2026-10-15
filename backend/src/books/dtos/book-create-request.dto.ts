import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class CreateBookDto {
    @IsNotEmpty() @IsString() title: string;
    @IsNotEmpty() @IsString() isbn: string;
    @IsNotEmpty() @IsString() description: string;
    @IsNotEmpty() @IsString() author: string;
    @IsNotEmpty() @IsString() category: string;
    @IsNotEmpty() @IsNumber() price: number;
    @IsNotEmpty() @IsNumber() @Min(0) stockQuantity: number;
    @IsNotEmpty() @IsString() coverImageUrl: string;
}
