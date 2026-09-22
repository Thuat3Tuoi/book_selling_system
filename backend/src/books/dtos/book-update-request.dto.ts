import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";


export class UpdateBookDto {
    @IsOptional() @IsString() title?:string;
    @IsOptional() @IsString() isbn?: string;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() author?: string;
    @IsOptional() @IsString() category?: string;
    @IsOptional() @IsNumber() price?: number;
    @IsOptional() @IsNumber() @Min(0) stockQuantity?: number;
    @IsOptional() @IsString() coverImageUrl?: string;
    @IsOptional() @IsString() status?: string;
}