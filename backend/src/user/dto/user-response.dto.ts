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
    readonly id: number;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string | null;
    readonly address: string | null;
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
