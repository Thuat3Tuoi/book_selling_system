import { IsInt, IsNotEmpty, IsPositive, Min } from "class-validator";

export class AddToCartDto {
    @IsNotEmpty()
    @IsInt()
    @IsPositive()
    bookId: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    quantity: number;
}
