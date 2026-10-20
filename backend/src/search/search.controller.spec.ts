import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import type { SearchBooksQueryDto } from './dto/search-books-query.dto.js';

describe('SearchController', () => {
  let controller: SearchController;
  const searchBooksMock = vi.fn().mockResolvedValue({
    hits: [],
    totalHits: 0,
    processingTimeMs: 1,
    page: 1,
    limit: 20,
  });

  beforeEach(async () => {
    searchBooksMock.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{
        provide: SearchService,
        useValue: {
          searchBooks: searchBooksMock
        }
      }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it("goi searchService.searchBooks voi q va cac filter truyen vao", async () => {
    const query: SearchBooksQueryDto = { q: "clean code", category: "Technology", page: 2, limit: 10 };

    await controller.searchBooks(query);

    expect(searchBooksMock).toHaveBeenCalledWith("clean code", {
      category: "Technology",
      page: 2,
      limit: 10,
      sort: undefined,
    });
  });

  it("dung chuoi rong khi khong truyen q (tim tat ca)", async () => {
    const query: SearchBooksQueryDto = {};

    await controller.searchBooks(query);

    expect(searchBooksMock).toHaveBeenCalledWith("", {
      category: undefined,
      page: undefined,
      limit: undefined,
      sort: undefined,
    });
  });
});
