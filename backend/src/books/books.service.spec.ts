import { Test, TestingModule } from "@nestjs/testing";
import { BooksService } from "./books.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { SearchService } from "../search/search.service.js";
import { RedisService } from "../redis/redis.service.js";

describe("BooksService", () => {
    let service: BooksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BooksService, 
                { provide: PrismaService, useValue: {} },
                { provide: SearchService, useValue: {} },
                { provide: RedisService, useValue: { get: vi.fn(), set: vi.fn() } },
            ],
        }).compile();

        service = module.get<BooksService>(BooksService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
