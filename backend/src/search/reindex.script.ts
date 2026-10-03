import 'dotenv/config'; 
import { NestFactory } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service.js";
import { SearchService } from "./search.service.js";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SearchModule } from "./search.module.js";
import { Module } from "@nestjs/common";

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
        logger: ['error', 'warn'],
    });

    const prisma = app.get(PrismaService);
    const searchService = app.get(SearchService);

    console.log("Bat dau dong bo toan bo sach vao Meilisearch...");
    const startedAt = performance.now();
    
    const books = await prisma.book.findMany({
        where: { status: "ACTIVE" },
    });

    console.log(`Tim thay ${books.length} sach ACTIVE can dong bo`);
    let successCount = 0;
    let failCount = 0;

    for (const book of books) {
        try {
            await searchService.indexBook(book);
            successCount++;
        } catch (error) {
            failCount++;
            console.log(`Loi dong bo sach id=${book.id}:`, (error as Error).message);
        }
    }

    const durationMs = Math.round(performance.now() - startedAt);
    console.log(
        `Hoan tat: ${successCount}/${books.length} sach dong bo thanh cong, `
        + `${failCount} loi, mat ${durationMs}ms`
    );

    await app.close();

    if (failCount > 0) {
        process.exitCode = 1;
    }
}

reindexAllBooks().catch((error) => {
    console.error("Reindex that bai:", error);
    process.exitCode = 1;
});