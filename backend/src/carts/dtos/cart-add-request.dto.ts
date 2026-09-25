import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class AddToCartDto {
    @IsNotEmpty() @IsNumber() bookId: number;
    @IsNotEmpty() @IsNumber() @Min(1) quantity: number;
}
