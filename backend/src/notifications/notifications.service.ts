import { Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationCreationRequest } from "./dtos/notification-creation-request.js";
import type { Notification } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class NotificationsService {
    constructor(private prismaService: PrismaService) {}

    createNotification = async (request: NotificationCreationRequest): Promise<Notification> => {
        return this.prismaService.notification.create({
            data: {
                ...request,
            },
        });
    };

    getNotificationById = async (notificationId: number): Promise<Notification> => {
        const noti = await this.prismaService.notification.findUnique({
            where: {
                id: notificationId,
            },
        });

        if (!noti) {
            throw new NotFoundException("Notification not found.");
        }

        return noti;
    };

    getNotifications = async (): Promise<Notification[]> => {
        return this.prismaService.notification.findMany();
    };
}
