import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class RefreshTokenDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @ApiPropertyOptional({ description: "Refresh token; may instead be supplied in the refreshToken cookie" })
    refreshToken?: string;
}
