import { ApiProperty } from "@nestjs/swagger";

export class MessageResponseDto {
    @ApiProperty({ type: String })
    message!: string;
}
