import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { Controller } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderEventPattern } from "../../order-event-pattern.enum.js";
import { NotificationsService } from "../../../notifications/notifications.service.js";

interface OrderCreatedEvent { id: string; orderId: number; userId: number }

@Controller()
export class OrderCreatedConsumer {
    constructor(
        private readonly notificationService: NotificationsService,
        private readonly configService: ConfigService,
    ) {}

    @EventPattern<string>(OrderEventPattern.CREATED)
    async handle(@Payload() event: OrderCreatedEvent, @Ctx() context: RmqContext) {
        const channel = context.getChannelRef();
        const message = context.getMessage();

        try {
            await channel.assertQueue(`${this.configService.getOrThrow<string>("RABBITMQ_QUEUE")}.outbox-v1.dlq`, { durable: true });
            await this.notificationService.createOrderNotification({
                eventId: event.id,
                orderId: event.orderId,
                userId: event.userId,
            });

            channel.ack(message);
        } catch {
            channel.nack(message, false, false);
        }
    }
}
