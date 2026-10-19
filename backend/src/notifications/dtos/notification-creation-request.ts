import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from "class-validator";
import { NotificationType } from "../../generated/prisma/enums.js";

export class NotificationCreationRequest {
    @IsEnum(NotificationType)
    notifyType!: NotificationType;

    @IsInt() @Min(1)
    userId!: number;

    @IsString() @IsNotEmpty()
    message!: string;
}
