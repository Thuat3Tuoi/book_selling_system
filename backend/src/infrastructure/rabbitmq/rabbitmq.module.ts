import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { OutboxPublisherService } from "./outbox-publisher.service.js";

@Module({
    imports: [
        // Cấu hình trong ClientsModule.register() → tạo RMQ client/producer, để bạn inject ClientProxy rồi gọi emit() hoặc send().
        ClientsModule.registerAsync([
            {
                name: "RABBITMQ",
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [configService.getOrThrow<string>("RABBITMQ_URL")],
                        queue: configService.getOrThrow<string>("RABBITMQ_QUEUE"),
                        queueOptions: {
                            durable: configService.get<string>("RABBITMQ_DURABLE") === "true",
                        },
                        persistent: configService.get<string>("RABBITMQ_PERSISTENT") === "true",
                    },
                }),
            },
        ]),
    ],
    providers: [OutboxPublisherService],
    exports: [ClientsModule],
})
export class RabbitmqModule {}
