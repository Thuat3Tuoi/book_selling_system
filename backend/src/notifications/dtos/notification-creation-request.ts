import { IsNotEmpty } from "class-validator";

export class NotificationCreationRequest {
    notifyType!: string;

    userId!: number;

    @IsNotEmpty()
    message!: string;
}
