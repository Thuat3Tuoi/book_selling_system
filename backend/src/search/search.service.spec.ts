import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service.js';
import { Meilisearch } from 'meilisearch';
import type { Book } from '../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';


const mockIndex = {
  addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
  deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
  search: vi.fn().mockResolvedValue({
    hits: [],
    estimatedTotalHits: 0,
    processingTimeMs: 5,
  }),
  updateSearchableAttributes: vi.fn().mockResolvedValue({ taskUid: 3 }),
  updateFilterableAttributes: vi.fn().mockResolvedValue({ taskUid: 4 }),
};

const mockClient = {
  index: vi.fn().mockReturnValue(mockIndex),
  createIndex: vi.fn().mockResolvedValue({ taskUid: 0 }),
};

vi.mock("meilisearch", () => {
  return {
    Meilisearch: class {
      index = vi.fn().mockReturnValue(mockIndex);
      createIndex = vi.fn().mockResolvedValue({ taskUid: 0 });
    },
  };
});

const sampleBook: Book = {
  id: 1,
  title: "Clean Code",
  author: "Robert C. Martin",
    isbn: "9780132350884",
    category: "Technology",
    description: "A handbook of agile software craftsmanship",
    price: { toString: () => "150000", valueOf: () => 150000 } as unknown as Book["price"],
    coverImageUrl: "https://example.com/clean-code.jpg",
    stockQuantity: 10,
    status: "ACTIVE", 
} as Book;

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, defaultvalue?: unknown) => defaultvalue),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it("toSearchDocument() chuyen dung field can thiet, bo field khong lien quan (stockQuantity, status)", () => {
    const doc = service.toSearchDocument(sampleBook);

    expect(doc).toEqual({
      id: 1,
            title: "Clean Code",
            author: "Robert C. Martin",
            isbn: "9780132350884",
            category: "Technology",
            description: "A handbook of agile software craftsmanship",
            price: 150000,
            coverImageUrl: "https://example.com/clean-code.jpg",
    });
  });

  it('indexBook() goi addDocuments voi dung documnent da chuyen doi', async () => {
    await service.indexBook(sampleBook);

    expect(mockIndex.addDocuments).toHaveBeenCalledWith([service.toSearchDocument(sampleBook)]);
  });

  it("removeBookFromIndex() goi deleteDocument voi dung id", async () => {
    await service.removeBookFromIndex(42);
    expect(mockIndex.deleteDocument).toHaveBeenCalledWith(42);
  });

  it("searchBooks() goi index.search voi query, limit, offset dung va tra ve ket qua chuan hoa", async () => {
    mockIndex.search.mockResolvedValueOnce({
      hits: [service.toSearchDocument(sampleBook)],
      estimatedTotalHits: 1,
      processingTimeMs: 7,
    });

    const result = await service.searchBooks("clean code", { page: 2, limit: 10 });
    expect(mockIndex.search).toHaveBeenCalledWith("clean code", {
      limit: 10,
      offset: 10,
      filter: undefined,
    });
    expect(result.totalHits).toBe(1);
    expect(result.processingTimeMs).toBe(7);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.hits).toHaveLength(1);
  });

  it("searchBooks() truyen filter dung khi co category", async () => {
    await service.searchBooks("clean code", { category: "Technology" });
    expect(mockIndex.search).toHaveBeenCalledWith(
      "clean code",
      expect.objectContaining({ filter: 'category = "Technology"'})
    );
  });

  it("searchBooks() dung page=1 limit=20 mac dinh khi khong truyen options", async () =>{
    await service.searchBooks("clean code");
    expect(mockIndex.search).toHaveBeenCalledWith("clean code", {
      limit: 20,
      offset: 0,
      filter: undefined,
    });
  });
});
