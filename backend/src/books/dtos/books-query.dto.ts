import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class BooksQueryDto {
    @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @ApiPropertyOptional({ type: Number, default: 10, minimum: 1, maximum: 100 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 10;
}
