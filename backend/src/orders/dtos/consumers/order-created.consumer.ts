import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { Controller } from "@nestjs/common";
import { NotificationsService } from "../../../notifications/notifications.service.js";
import type { Order } from "../../../generated/prisma/client.js";
import { ConfigService } from "@nestjs/config";
import { consumeWithRetry } from "../../../infrastructure/rabbitmq/consume-with-retry.js";

@Controller()
export class OrderCreatedConsumer {
    constructor(
        private readonly notificationService: NotificationsService,
        private readonly config: ConfigService,
    ) {}

    @EventPattern<string>("order.created")
    async handle(@Payload() event: Order, @Ctx() context: RmqContext) {
        await consumeWithRetry(context, this.config.getOrThrow<string>("RABBITMQ_QUEUE"), async () => {
            await this.notificationService.createOrderNotification(event);
        });
    }
}
