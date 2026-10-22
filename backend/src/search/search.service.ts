import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch, type Index } from "meilisearch";
import type { Book } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const BOOKS_INDEX = "books";

export interface BookSearchDocument {
    id: number;
    title: string;
    author: string;
    isbn: string;
    category: string;
    description: string;
    price: number;
    coverImageUrl: string;
}

export interface SearchBooksOptions {
    category?: string;
    page?: number;
    limit?: number;
    sort?: "price:asc" | "price:desc";
}

export interface SearchBooksResult {
    hits: BookSearchDocument[];
    totalHits: number;
    processingTimeMs: number;
    page: number;
    limit: number;
}

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);
    private readonly client: Meilisearch;
    private index: Index<BookSearchDocument>;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const host =
            this.configService?.get<string>("MEILISEARCH_HOST") ||
            process.env.MEILISEARCH_HOST ||
            "http://localhost:7700";

        const apiKey =
            this.configService?.get<string>("MEILISEARCH_API_KEY") ||
            process.env.MEILISEARCH_API_KEY;

        this.client = new Meilisearch({
            host,
            apiKey,
        });
        this.index = this.client.index<BookSearchDocument>(BOOKS_INDEX);
    }

    async health(): Promise<void> {
        const result = await this.client.health();
        if (result.status !== "available") {
            throw new Error("Meilisearch unavailable");
        }
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.waitForTask((await this.client.createIndex(BOOKS_INDEX, { primaryKey: "id" })).taskUid);
        } catch (error) {
            const code = (error as { code?: string })?.code;
            if (code !== "index_already_exists") {
                this.logger.error(
                    `Khong the tao Meilisearch index "${BOOKS_INDEX}": ${(error as Error).message}`
                );
                return;
            }
        }

        try {
            await this.waitForTask((await this.index.updateSearchableAttributes([
                "title",
                "author",
                "isbn",
                "category",
                "description",
            ])).taskUid);
            await this.waitForTask((await this.index.updateFilterableAttributes(["category"])).taskUid);
            await this.waitForTask((await this.index.updateSortableAttributes(["price"])).taskUid);
            // await this.index.updateTypoTolerance({
            //     minWordSizeForTypos: {
            //         oneTypo: 6,
            //     }
            // });
            this.logger.log(`Meilisearch index "${BOOKS_INDEX}"  da san sang`);
        } catch (error) {
            this.logger.error(
                `Khong the cau hinh Meilisearch index "${BOOKS_INDEX}": ${(error as Error).message}`
            );
        }
    }

    toSearchDocument(book: Book): BookSearchDocument {
        return {
            id: book.id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            category: book.category,
            description: book.description,
            price: Number(book.price),
            coverImageUrl: book.coverImageUrl,
        };
    }

    async indexBook(book: Book): Promise<void> {
        const task = await this.index.addDocuments([this.toSearchDocument(book)]);
        await this.waitForTask(task.taskUid);
        this.logger.log(`Dong bo sach id=${book.id} vao Meilisearch (taskUid=${task.taskUid})`);
    }

    async removeBookFromIndex(bookId: number): Promise<void> {
        const task = await this.index.deleteDocument(bookId);
        await this.waitForTask(task.taskUid);
        this.logger.log(`Xoa sach id=${bookId} khoi Meilisearch (taskUid=${task.taskUid})`);
    }

    async searchBooks(query: string, options: SearchBooksOptions = {}): Promise<SearchBooksResult> {
        const page = options.page ?? 1;
        const limit = options.limit ?? 20;
        const offset = (page - 1) * limit;

        const escapedCategory = options.category?.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const filter = escapedCategory ? `category = "${escapedCategory}"` : undefined;

        let result;
        try {
            result = await this.index.search<BookSearchDocument>(query, {
            limit,
            offset,
            filter,
            sort: options.sort ? [options.sort] : undefined,
            matchingStrategy: "all",
            });
        } catch (error) {
            this.logger.error(`Meilisearch query failed: ${(error as Error).message}`);
            throw new ServiceUnavailableException("Search is temporarily unavailable");
        }

        // Meilisearch is eventually consistent. Check the source of truth before
        // exposing a hit so a recently disabled book cannot remain public.
        const ids = result.hits.map((hit) => hit.id);
        const activeBooks = ids.length === 0 ? [] : await this.prisma.book.findMany({
            where: { id: { in: ids }, status: "ACTIVE" },
            select: { id: true },
        });
        const activeIds = new Set(activeBooks.map((book) => book.id));

        return {
            hits: result.hits.filter((hit) => activeIds.has(hit.id)),
            totalHits: result.estimatedTotalHits ?? result.hits.length,
            processingTimeMs: result.processingTimeMs,
            page,
            limit,
        };
    }

    async reindexAll(books: Book[], signal?: AbortSignal): Promise<void> {
        const activeBooks = books.filter((book) => book.status === "ACTIVE");
        const activeIds = new Set(activeBooks.map((book) => book.id));
        const BATCH = 1000;
        for (let i = 0; i < activeBooks.length; i += BATCH) {
            signal?.throwIfAborted();
            const docs = activeBooks.slice(i, i + BATCH).map((b) => this.toSearchDocument(b));
            const task = await this.index.addDocuments(docs);
            await this.waitForTask(task.taskUid);
            this.logger.log(`Batch ${i / BATCH + 1}: taskUid=${task.taskUid}`);
        }

        let offset = 0;
        const staleIds: number[] = [];
        while (true) {
            signal?.throwIfAborted();
            const page = await this.index.getDocuments({ fields: ["id"], limit: BATCH, offset });
            staleIds.push(...page.results.filter((doc) => !activeIds.has(doc.id)).map((doc) => doc.id));
            if (page.results.length < BATCH) break;
            offset += BATCH;
        }
        for (let i = 0; i < staleIds.length; i += BATCH) {
            signal?.throwIfAborted();
            await this.waitForTask((await this.index.deleteDocuments(staleIds.slice(i, i + BATCH))).taskUid);
        }
    }

    private async waitForTask(taskUid: number): Promise<void> {
        const task = await this.client.tasks.waitForTask(taskUid, { timeout: 30_000 });
        if (task.status !== "succeeded") {
            throw Object.assign(
                new Error(`Meilisearch task ${taskUid} failed: ${task.error?.message ?? task.status}`),
                { code: task.error?.code },
            );
        }
    }
}
