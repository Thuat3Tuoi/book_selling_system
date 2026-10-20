import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationCreationRequest } from "./dtos/notification-creation-request.js";
import type { Notification } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { canManageCatalog, type AuthenticatedUser } from "../auth/authenticated-user.js";

@Injectable()
export class NotificationsService {
    constructor(private prismaService: PrismaService) {}

    createNotification = async (request: NotificationCreationRequest): Promise<Notification> => {
        return this.prismaService.notification.create({
            data: {
                notifyType: request.notifyType,
                userId: request.userId,
                message: request.message,
            },
        });
    };

    getNotificationById = async (notificationId: number, user: AuthenticatedUser): Promise<Notification> => {
        const noti = await this.prismaService.notification.findUnique({
            where: {
                id: notificationId,
            },
        });

        if (!noti) {
            throw new NotFoundException("Notification not found.");
        }

        if (!canManageCatalog(user) && noti.userId !== user.id) {
            throw new ForbiddenException("Cannot access another user's notification");
        }

        return noti;
    };

    getNotifications = async (user: AuthenticatedUser): Promise<Notification[]> => {
        return this.prismaService.notification.findMany({
            where: canManageCatalog(user) ? undefined : { userId: user.id },
        });
    };
}
