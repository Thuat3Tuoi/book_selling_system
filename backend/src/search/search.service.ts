import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch, type Index } from "meilisearch";
import type { Book } from '../generated/prisma/client.js';

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

    constructor(private readonly configService: ConfigService) {
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
            await this.client.createIndex(BOOKS_INDEX, { primaryKey: "id" });
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
            await this.index.updateSearchableAttributes([
                "title",
                "author",
                "isbn",
                "category",
                "description",
            ]);
            await this.index.updateFilterableAttributes(["category"]);
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
        const documnent = this.toSearchDocument(book);
        const task = await this.index.addDocuments([documnent]);
        this.logger.log(`Dong bo sach id=${book.id} vao Meilisearch (taskUid=${task.taskUid})`);
    }

    async removeBookFromIndex(bookId: number): Promise<void> {
        const task = await this.index.deleteDocument(bookId);
        this.logger.log(`Xoa sach id=${bookId} khoi Meilisearch (taskUid=${task.taskUid})`);
    }

    async searchBooks(query: string, options: SearchBooksOptions = {}): Promise<SearchBooksResult> {
        const page = options.page ?? 1;
        const limit = options.limit ?? 20;
        const offset = (page - 1) * limit;

        const escapedCategory = options.category?.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const filter = escapedCategory ? `category = "${escapedCategory}"` : undefined;

        const result = await this.index.search<BookSearchDocument>(query, {
            limit,
            offset,
            filter,
            matchingStrategy: "all",
        });

        return {
            hits: result.hits,
            totalHits: result.estimatedTotalHits ?? result.hits.length,
            processingTimeMs: result.processingTimeMs,
            page,
            limit,
        };
    }

    async reindexAll(books: Book[]): Promise<void> {
        const BATCH = 1000;
        for (let i = 0; i < books.length; i += BATCH) {
            const docs = books.slice(i, i + BATCH).map((b) => this.toSearchDocument(b));
            const task = await this.index.addDocuments(docs);
            this.logger.log(`Batch ${i / BATCH + 1}: taskUid=${task.taskUid}`);
        }
    }
}
