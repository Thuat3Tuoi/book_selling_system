import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module.js";
import { SearchService } from "../search/search.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const books = await app.get(PrismaService).book.findMany();
    await app.get(SearchService).reindexAll(books);
    await app.close();
}
main();
