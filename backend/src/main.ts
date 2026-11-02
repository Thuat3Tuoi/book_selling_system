import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { Transport, type MicroserviceOptions } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { allowedOrigins } from "./config/environment.js";
import { describeResponseEnvelopes } from "./docs/openapi-responses.js";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableShutdownHooks();

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

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    app.use(cookieParser());

    app.enableCors({
        origin: allowedOrigins(configService.get<string>("CORS_ORIGINS"), configService.get<string>("NODE_ENV")),
        credentials: true,
    });
    const document = SwaggerModule.createDocument(app, new DocumentBuilder()
        .setTitle("Book Selling API")
        .setDescription("Responses use { success: true, data, meta? }; errors use { success: false, error }.")
        .setVersion("1.0")
        .addBearerAuth()
        .build());
    describeResponseEnvelopes(document);
    SwaggerModule.setup("api/docs", app, document);
    await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
