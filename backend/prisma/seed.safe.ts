import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { BookStatus, Prisma, PrismaClient, RoleName } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
const password = process.env.SEED_DEFAULT_PASSWORD;
if (!connectionString || !password) {
    throw new Error("DATABASE_URL and SEED_DEFAULT_PASSWORD are required");
}
if (process.env.NODE_ENV === "production") {
    throw new Error("Sample accounts cannot be seeded in production");
}
if (process.env.SEED_SAMPLE_DATA !== "YES") {
    throw new Error("Set SEED_SAMPLE_DATA=YES only for an isolated development database");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
    const passwordHash = await bcrypt.hash(password!, 10);
    await prisma.$transaction(async (tx) => {
        for (const roleName of [RoleName.ADMIN, RoleName.STAFF, RoleName.CUSTOMER]) {
            await tx.role.upsert({ where: { roleName }, create: { roleName }, update: {} });
        }

        for (const sample of [
            { email: "staff@bookstore.example.com", firstName: "Sample", lastName: "Staff", roleName: RoleName.STAFF },
            { email: "customer-a@bookstore.example.com", firstName: "Customer", lastName: "A", roleName: RoleName.CUSTOMER },
            { email: "customer-b@bookstore.example.com", firstName: "Customer", lastName: "B", roleName: RoleName.CUSTOMER },
        ]) {
            await tx.user.upsert({
                where: { email: sample.email },
                create: {
                    email: sample.email,
                    firstName: sample.firstName,
                    lastName: sample.lastName,
                    passwordHash,
                    role: { connect: { roleName: sample.roleName } },
                },
                update: {},
            });
        }

        await tx.book.upsert({
            where: { isbn: "9780132350884" },
            create: {
                title: "Clean Code",
                isbn: "9780132350884",
                description: "Sample book for local API verification",
                author: "Robert C. Martin",
                category: "Software",
                price: new Prisma.Decimal(150000),
                stockQuantity: 20,
                coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
                status: BookStatus.ACTIVE,
            },
            update: {},
        });
    });
    console.log("Sample roles, two customer accounts, staff account and one book are present.");
}

main().catch((error: unknown) => {
    console.error("Safe seed failed:", error);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
