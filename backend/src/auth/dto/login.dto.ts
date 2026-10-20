import { IsEmail, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
    @IsEmail()
    @ApiProperty({ format: "email", example: "minh.tran@example.com" })
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty({ minLength: 6, format: "password" })
    password: string;
}
