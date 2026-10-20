import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { NotificationCreationRequest } from "./dtos/notification-creation-request.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { RolesGuard } from "../guards/roles.guard.js";
import { Roles } from "../guards/roles.decorator.js";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { NotificationResponseDto } from "./dtos/notification-response.dto.js";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
    constructor(private notificationService: NotificationsService) {}

    @Post()
    @UseGuards(RolesGuard)
    @Roles("ADMIN", "STAFF")
    async createNotification(
        @Body() request: NotificationCreationRequest
    ): Promise<NotificationResponseDto> {
        return new NotificationResponseDto(
            await this.notificationService.createNotification(request)
        );
    }

    @Get(":id")
    async getNotificationById(
        @Param("id", ParseIntPipe) notificationId: number,
        @Req() req: { user: AuthenticatedUser }
    ): Promise<NotificationResponseDto> {
        return new NotificationResponseDto(
            await this.notificationService.getNotificationById(notificationId, req.user)
        );
    }

    @Get()
    async getNotifications(
        @Req() req: { user: AuthenticatedUser }
    ): Promise<NotificationResponseDto[]> {
        const notifications = await this.notificationService.getNotifications(req.user);
        return notifications.map((notification) => new NotificationResponseDto(notification));
    }
}
