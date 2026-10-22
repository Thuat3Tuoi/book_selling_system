import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { BooksModule } from "./books/books.module.js";
import { CartsModule } from "./carts/carts.module.js";
import { UserModule } from "./user/user.module.js";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor.js";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor.js";
import { ResponseEnvelopeExceptionFilter } from "./common/filters/response-envelope-exception.filter.js";
import { OrderItemsModule } from "./order-items/order-items.module.js";
import { ScheduleModule } from "@nestjs/schedule";
import { CronJobModule } from "./infrastructure/cron-job/cron-job.module.js";
import { SearchModule } from './search/search.module.js';
import { RedisModule } from "./redis/redis.module.js";
import { HealthController } from "./health.controller.js";
import { validateEnvironment } from "./config/environment.js";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
        PrismaModule,
        OrdersModule,
        NotificationsModule,
        AuthModule,
        BooksModule,
        CartsModule,
        UserModule,
        OrderItemsModule,
        ScheduleModule.forRoot(),
        CronJobModule,
        SearchModule,
        RedisModule
    ],
    controllers: [AppController, HealthController],
    providers: [
        AppService,
        { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
        { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
        { provide: APP_FILTER, useClass: ResponseEnvelopeExceptionFilter },
    ],
})
export class AppModule {}
