import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "../../generated/prisma/enums.js";

export class NotificationCreationRequest {
    @IsEnum(NotificationType)
    @ApiProperty({ enum: NotificationType })
    notifyType!: NotificationType;

    @IsInt()
    @Min(1)
    @ApiProperty({ minimum: 1 })
    userId!: number;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    message!: string;
}
