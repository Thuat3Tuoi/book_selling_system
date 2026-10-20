import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service.js";
import { SearchService } from "./search.service.js";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SearchModule } from "./search.module.js";
import { Module } from "@nestjs/common";
import { BookStatus } from "../generated/prisma/enums.js";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        SearchModule,
    ],
})
class ReindexContextModule {}

async function reindexAllBooks() {
    const app = await NestFactory.createApplicationContext(ReindexContextModule, {
        logger: ["error", "warn"],
    });

    try {
        const prisma = app.get(PrismaService);
        const searchService = app.get(SearchService);
        console.log("Bat dau dong bo toan bo sach vao Meilisearch...");
        const startedAt = performance.now();
        const books = await prisma.book.findMany({
            where: { status: BookStatus.ACTIVE },
        });
        console.log(`Tim thay ${books.length} sach ACTIVE can dong bo`);
        await searchService.reindexAll(books);
        const durationMs = Math.round(performance.now() - startedAt);
        console.log(`Hoan tat: ${books.length} sach dong bo thanh cong, mat ${durationMs}ms`);
    } finally {
        await app.close();
    }
}

reindexAllBooks().catch((error) => {
    console.error("Reindex that bai:", error);
    process.exitCode = 1;
});
