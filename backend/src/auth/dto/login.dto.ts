import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class LoginDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsNotEmpty()
    phoneNumber: string;

    @IsNotEmpty()
    address: string;
}
