import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { Transport, type MicroserviceOptions } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);

    const rabbitUrl = configService.getOrThrow<string>("RABBITMQ_URL");
    const queue = configService.getOrThrow<string>("RABBITMQ_QUEUE");
    const durable = configService.get<string>("RABBITMQ_DURABLE") === "true";

    // Cấu hình trong main.ts với connectMicroservice() → tạo RMQ server/consumer, tức NestJS sẽ lắng nghe queue và chạy @EventPattern, @MessagePattern.
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue,
            queueOptions: {
                durable,
            },
            noAck: false,
            prefetchCount: 10,
        },
    });

    await app.startAllMicroservices();
    await app.listen(process.env.PORT ?? 3000);
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );
    app.use(cookieParser());
    app.enableCors({
        origin: "http://localhost:3000",
        credentials: true,
    });
    await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
