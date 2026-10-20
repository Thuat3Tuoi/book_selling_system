import { ApiProperty } from "@nestjs/swagger";

type PublicUserFields = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    address: string | null;
    roleId: number;
};

export class UserResponseDto {
    @ApiProperty()
    readonly id: number;
    @ApiProperty()
    readonly firstName: string;
    @ApiProperty()
    readonly lastName: string;
    @ApiProperty({ format: "email" })
    readonly email: string;
    @ApiProperty({ type: String, nullable: true })
    readonly phone: string | null;
    @ApiProperty({ type: String, nullable: true })
    readonly address: string | null;
    @ApiProperty()
    readonly roleId: number;

    constructor(user: PublicUserFields) {
        this.id = user.id;
        this.firstName = user.firstName;
        this.lastName = user.lastName;
        this.email = user.email;
        this.phone = user.phoneNumber;
        this.address = user.address;
        this.roleId = user.roleId;
    }
}
