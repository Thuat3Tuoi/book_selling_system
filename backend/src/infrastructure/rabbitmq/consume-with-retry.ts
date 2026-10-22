import { Logger } from "@nestjs/common";
import type { RmqContext } from "@nestjs/microservices";

const logger = new Logger("RabbitConsumer");

export async function consumeWithRetry(
    context: RmqContext,
    queue: string,
    handle: () => Promise<void>,
): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await handle();
            channel.ack(message);
            return;
        } catch (error) {
            logger.error(`Consumer ${context.getPattern()} attempt ${attempt}: ${(error as Error).message}`);
            if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
    }

    try {
        const deadQueue = `${queue}.dead`;
        await channel.assertQueue(deadQueue, { durable: true });
        await new Promise<void>((resolve, reject) => {
            channel.sendToQueue(deadQueue, message.content, { persistent: true }, (error: Error | null) => {
                if (error) reject(error);
                else resolve();
            });
        });
        channel.ack(message);
        logger.error(`Message moved to ${deadQueue} after three failed attempts`);
    } catch (error) {
        logger.error(`Could not dead-letter message: ${(error as Error).message}`);
        channel.nack(message, false, true);
    }
}
