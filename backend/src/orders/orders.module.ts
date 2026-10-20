import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { BooksModule } from "../books/books.module.js";
import { OrderCreatedConsumer } from "./dtos/consumers/order-created.consumer.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { PassportModule } from "@nestjs/passport";
import { RolesGuard } from "../guards/roles.guard.js";

@Module({
    imports: [BooksModule, NotificationsModule,
        PassportModule.register({
                        defaultStrategy: "jwt",
                    }),
    ],
    controllers: [OrdersController, OrderCreatedConsumer],
    providers: [OrdersService, RolesGuard],
})
export class OrdersModule {}
