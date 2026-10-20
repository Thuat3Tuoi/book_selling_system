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
                        queue: `${configService.getOrThrow<string>("RABBITMQ_QUEUE")}.outbox-v1`,
                        queueOptions: {
                            durable: configService.get<string>("RABBITMQ_DURABLE") === "true",
                            arguments: {
                                "x-dead-letter-exchange": "",
                                "x-dead-letter-routing-key": `${configService.getOrThrow<string>("RABBITMQ_QUEUE")}.outbox-v1.dlq`,
                            },
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
