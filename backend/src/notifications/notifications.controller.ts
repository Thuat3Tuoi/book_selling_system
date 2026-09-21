import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import type { NotificationCreationRequest } from "./dtos/notification-creation-request.js";
import type { Notification } from "../generated/prisma/client.js";

@Controller("notifications")
export class NotificationsController {
    constructor(private notificationService: NotificationsService) {}

    @Post()
    createNotification(@Body() request: NotificationCreationRequest): Promise<Notification> {
        return this.notificationService.createNotification(request);
    }

    @Get(":id")
    getNotificationById(@Param("id", ParseIntPipe) notificationId: number ): Promise<Notification> {
        return this.notificationService.getNotificationById(notificationId);
    }

    @Get()
    getNotifications(): Promise<Notification[]> {
        return this.notificationService.getNotifications();
    }
}
