import type { Notification } from "../../generated/prisma/client.js";

export class NotificationResponseDto {
    readonly id: number;
    readonly notifyType: string;
    readonly userId: number;
    readonly message: string;
    readonly status: boolean;
    readonly createdAt: Date;

    constructor(notification: Notification) {
        this.id = notification.id;
        this.notifyType = notification.notifyType;
        this.userId = notification.userId;
        this.message = notification.message;
        this.status = notification.status;
        this.createdAt = notification.createdAt;
    }
}
