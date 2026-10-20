import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class NotificationCreationRequest {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    notifyType!: string;

    @IsInt()
    @Min(1)
    @ApiProperty({ minimum: 1 })
    userId!: number;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    message!: string;
}
