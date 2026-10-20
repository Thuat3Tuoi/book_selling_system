import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { CronJobService } from "../src/infrastructure/cron-job/cron-job.service.js";
import { BookStatus, Prisma } from "../src/generated/prisma/client.js";

describe("low stock cron across two application instances (e2e)", () => {
    let first: INestApplication;
    let second: INestApplication;
    let prisma: PrismaService;
    let bookId: number;

    beforeAll(async () => {
        const [firstModule, secondModule] = await Promise.all([
            Test.createTestingModule({ imports: [AppModule] }).compile(),
            Test.createTestingModule({ imports: [AppModule] }).compile(),
        ]);
        first = firstModule.createNestApplication();
        second = secondModule.createNestApplication();
        await Promise.all([first.init(), second.init()]);
        prisma = first.get(PrismaService);
        const book = await prisma.book.create({
            data: {
                title: "Cron audit book",
                isbn: `cron-audit-${randomUUID()}`,
                description: "Isolated cron integration test",
                author: "Audit",
                category: "Testing",
                price: new Prisma.Decimal(100),
                stockQuantity: 1,
                coverImageUrl: "https://example.com/cron.jpg",
                status: BookStatus.ACTIVE,
            },
        });
        bookId = book.id;
    });

    afterAll(async () => {
        if (bookId) await prisma.book.delete({ where: { id: bookId } });
        await Promise.all([first?.close(), second?.close()]);
    });

    it("stores one nonempty notification for the Vietnam calendar day", async () => {
        await Promise.all([
            first.get(CronJobService).sendNotification(),
            second.get(CronJobService).sendNotification(),
        ]);
        const dateParts = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(new Date());
        const part = (type: "year" | "month" | "day") => dateParts.find((item) => item.type === type)?.value;
        const eventPrefix = `low-stock:${part("year")}-${part("month")}-${part("day")}:`;
        const stored = await prisma.notification.findMany({ where: { eventId: { startsWith: eventPrefix } } });
        const recipients = await prisma.user.count({
            where: { status: true, role: { roleName: { in: ["ADMIN", "STAFF"] } } },
        });
        expect(stored).toHaveLength(recipients);
        expect(recipients).toBeGreaterThan(0);
        expect(new Set(stored.map(({ userId }) => userId)).size).toBe(recipients);
        for (const notification of stored) expect(JSON.parse(notification.message)).not.toHaveLength(0);
    }, 15_000);
});
