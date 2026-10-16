import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { Controller } from "@nestjs/common";
import { NotificationsService } from "../../../notifications/notifications.service.js";
import type { Order } from "../../../generated/prisma/client.js";

@Controller()
export class OrderCreatedConsumer {
    constructor(private readonly notificationService: NotificationsService) {}

    @EventPattern<string>("order.created")
    async handle(@Payload() event: Order, @Ctx() context: RmqContext) {
        console.log("Send email...");
        // await new Promise((resolve) => setTimeout(resolve, 10000));

        const channel = context.getChannelRef();
        const message = context.getMessage();

        try {
            console.log("event:", event);

            await this.notificationService.createNotification({
                notifyType: "THONG BAO",
                userId: event.userId,
                message: JSON.stringify(event),
            });

            channel.ack(message);

            console.log("Send email successfully!");
        } catch {
            channel.nack(message, false, true);
            // message → message hiện tại.
            // false → chỉ áp dụng cho message này, không phải nhiều message trước đó.
            // true → requeue, tức đưa message trở lại queue để xử lý lại.
        }
    }
}
