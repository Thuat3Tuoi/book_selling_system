import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class NotificationCreationRequest {
    @IsString()
    @IsNotEmpty()
    notifyType!: string;

    @IsInt()
    @Min(1)
    userId!: number;

    @IsString()
    @IsNotEmpty()
    message!: string;
}
