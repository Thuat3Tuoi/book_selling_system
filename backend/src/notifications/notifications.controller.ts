import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { NotificationCreationRequest } from "./dtos/notification-creation-request.js";
import type { Notification } from "../generated/prisma/client.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { StaffAuthGuard } from "../guards/staff-auth.guard.js";
import { ApiBearerAuth, ApiForbiddenResponse } from "@nestjs/swagger";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
    constructor(private notificationService: NotificationsService) {}

    @Post()
    @UseGuards(StaffAuthGuard)
    @ApiForbiddenResponse({ description: "Requires ADMIN or STAFF" })
    createNotification(@Body() request: NotificationCreationRequest): Promise<Notification> {
        return this.notificationService.createNotification(request);
    }

    @Get(":id")
    getNotificationById(@Req() req: any, @Param("id", ParseIntPipe) notificationId: number): Promise<Notification> {
        return this.notificationService.getNotificationById(notificationId, req.user.id);
    }

    @Get()
    getNotifications(@Req() req: any): Promise<Notification[]> {
        return this.notificationService.getNotifications(req.user.id);
    }
}
