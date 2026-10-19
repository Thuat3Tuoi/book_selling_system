import { Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationCreationRequest } from "./dtos/notification-creation-request.js";
import type { Notification } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationType } from "../generated/prisma/enums.js";

@Injectable()
export class NotificationsService {
    constructor(private prismaService: PrismaService) {}

    createNotification(request: NotificationCreationRequest): Promise<Notification>;
    createNotification(request: NotificationCreationRequest, eventId: string): Promise<Notification | null>;
    async createNotification(request: NotificationCreationRequest, eventId?: string): Promise<Notification | null> {
        try {
            return await this.prismaService.notification.create({
                data: {
                    notifyType: request.notifyType,
                    userId: request.userId,
                    message: request.message,
                    ...(eventId ? { eventId } : {}),
                },
            });
        } catch (error) {
            if (eventId && (error as { code?: string }).code === "P2002") return null;
            throw error;
        }
    }

    async createOrderNotification(event: { eventId: string; orderId: number; userId: number }): Promise<void> {
        try {
            await this.prismaService.notification.create({
                data: {
                    eventId: event.eventId,
                    notifyType: NotificationType.ORDER_CREATED,
                    userId: event.userId,
                    message: `Order #${event.orderId} created`,
                },
            });
        } catch (error) {
            if ((error as { code?: string }).code === "P2002") return;
            throw error;
        }
    }

    getNotificationById = async (notificationId: number, userId: number): Promise<Notification> => {
        const noti = await this.prismaService.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });

        if (!noti) {
            throw new NotFoundException("Notification not found.");
        }

        return noti;
    };

    getNotifications = async (userId: number): Promise<Notification[]> => {
        return this.prismaService.notification.findMany({ where: { userId } });
    };
}
