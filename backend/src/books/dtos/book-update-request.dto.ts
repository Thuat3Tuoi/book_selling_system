import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateBookDto {
    @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() isbn?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() author?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
    @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsNumber() @Min(0) price?: number;
    @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @IsInt() @Min(0) stockQuantity?: number;
    @ApiPropertyOptional({ format: "uri" }) @IsOptional() @IsString() coverImageUrl?: string;
    @ApiPropertyOptional({ enum: ["ACTIVE", "INACTIVE"] }) @IsOptional() @IsIn(["ACTIVE", "INACTIVE"]) status?: string;
}
