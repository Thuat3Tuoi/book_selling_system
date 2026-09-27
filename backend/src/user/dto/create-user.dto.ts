import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsNotEmpty()
    @IsString()
    lastName: string;

    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    phoneNumber: string;

    @IsOptional()
    @IsString()
    address: string;
}
