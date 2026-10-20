import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    firstName: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    lastName: string;

    @IsEmail()
    @ApiProperty({ format: "email" })
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    @IsString()
    @ApiProperty({ minLength: 6, format: "password" })
    password: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
    phoneNumber: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
    address: string;
}
