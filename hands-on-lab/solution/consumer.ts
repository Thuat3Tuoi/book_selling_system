import type { LabContext } from "../types.js";

export async function consumeWithRetryLab(
    context: LabContext,
    queue: string,
    handle: () => Promise<void>,
): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await handle();
        } catch {
            if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 200));
            }
            continue;
        }
        channel.ack(message);
        return;
    }

    try {
        const deadQueue = `${queue}.dead`;
        await channel.assertQueue(deadQueue, { durable: true });
        await new Promise<void>((resolve, reject) => {
            channel.sendToQueue(deadQueue, message.content, { persistent: true }, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    } catch {
        channel.nack(message, false, true);
        return;
    }
    channel.ack(message);
}
