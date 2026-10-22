import { ApiProperty } from "@nestjs/swagger";
import { UserResponseDto } from "../../user/dto/user-response.dto.js";

export class LoginResponseDto {
    @ApiProperty()
    accessToken!: string;

    @ApiProperty({ type: () => UserResponseDto })
    user!: UserResponseDto;
}

export class AccessTokenResponseDto {
    @ApiProperty()
    accessToken!: string;
}
