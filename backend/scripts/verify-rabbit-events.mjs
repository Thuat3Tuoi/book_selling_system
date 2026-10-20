// Publishes duplicate and failing events to the disposable broker/database only.
import amqp from "amqplib";
import pg from "pg";

const queue = process.env.RABBITMQ_QUEUE;
const connection = await amqp.connect(process.env.RABBITMQ_URL);
const channel = await connection.createConfirmChannel();
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
    await db.connect();
    await channel.assertQueue(queue, { durable: true });
    await channel.assertQueue(`${queue}.dead`, { durable: true });
    const publish = (data) => channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify({ pattern: "order.created", data })),
        { persistent: true },
    );
    publish({ id: 1, userId: 3 });
    publish({ id: 1, userId: 3 });
    publish({ id: 999999, userId: 999999 });
    await channel.waitForConfirms();

    let notificationCount = 0;
    let deadMessages = 0;
    for (let attempt = 0; attempt < 50; attempt++) {
        const result = await db.query(
            'SELECT count(*)::int AS count FROM "Notification" WHERE "eventKey" = $1',
            ["order.created:1"],
        );
        notificationCount = result.rows[0].count;
        deadMessages = (await channel.checkQueue(`${queue}.dead`)).messageCount;
        if (notificationCount === 1 && deadMessages === 1) break;
        await sleep(200);
    }
    console.log(JSON.stringify({ notificationCount, deadMessages }));
    if (notificationCount !== 1 || deadMessages !== 1) {
        throw new Error("RabbitMQ idempotency or dead-letter verification failed");
    }
} finally {
    await db.end();
    await channel.close();
    await connection.close();
}
