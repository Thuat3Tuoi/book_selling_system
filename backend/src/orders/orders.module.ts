import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { BooksModule } from "../books/books.module.js";
import { RabbitmqModule } from "../infrastructure/rabbitmq/rabbitmq.module.js";
import { OrderCreatedConsumer } from "./dtos/consumers/order-created.consumer.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { PassportModule } from "@nestjs/passport";
import { OrderOutboxPublisher } from "./order-outbox.publisher.js";

@Module({
    imports: [BooksModule, RabbitmqModule, NotificationsModule,
        PassportModule.register({
                        defaultStrategy: "jwt",
                    }),
    ],
    controllers: [OrdersController, OrderCreatedConsumer],
    providers: [OrdersService, OrderOutboxPublisher],
})
export class OrdersModule {}
