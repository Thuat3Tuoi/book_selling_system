import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class RegisterDto {
    @IsNotEmpty()
    firstName: string;

    @IsNotEmpty()
    lastName: string;

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
