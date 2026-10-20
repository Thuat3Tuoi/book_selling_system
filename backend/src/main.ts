import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { Transport, type MicroserviceOptions } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { describeResponseEnvelopes } from "./docs/openapi-responses.js";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableShutdownHooks();

    const configService = app.get(ConfigService);

    const rabbitUrl = configService.getOrThrow<string>("RABBITMQ_URL");
    const queue = `${configService.getOrThrow<string>("RABBITMQ_QUEUE")}.outbox-v1`;
    const durable = configService.get<string>("RABBITMQ_DURABLE") === "true";

    // Cấu hình trong main.ts với connectMicroservice() → tạo RMQ server/consumer, tức NestJS sẽ lắng nghe queue và chạy @EventPattern, @MessagePattern.
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue,
            queueOptions: {
                durable,
                arguments: {
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": `${queue}.dlq`,
                },
            },
            noAck: false,
            prefetchCount: 10,
        },
    });
    await app.startAllMicroservices();

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    app.use(cookieParser());

    const allowedOrigins = (configService.get<string>("CORS_ORIGINS") ?? "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
    });
    const openApiConfig = new DocumentBuilder()
        .setTitle("Book Selling API")
        .setDescription("Responses use { success, data, meta? }; errors use { success: false, error }.")
        .setVersion("1.0")
        .addBearerAuth()
        .build();
    const openApiDocument = describeResponseEnvelopes(SwaggerModule.createDocument(app, openApiConfig));
    SwaggerModule.setup("api-docs", app, openApiDocument);
    await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
