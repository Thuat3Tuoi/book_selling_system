import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";


export class SearchBooksQueryDto {
    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: "Full text query" })
    q?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
    category?: string;

    @IsOptional()
    @IsIn(["price:asc", "price:desc"])
    @ApiPropertyOptional({ enum: ["price:asc", "price:desc"] })
    sort?: "price:asc" | "price:desc";

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
    limit?: number;
}
