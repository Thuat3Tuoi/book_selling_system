import { Test, TestingModule } from "@nestjs/testing";
import { BooksController } from "./books.controller.js";
import { BooksService } from "./books.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

vi.mock("../generated/prisma/client.js", () => ({
    PrismaClient: class {},
    Prisma: {},
}));

describe("BooksController", () => {
    let controller: BooksController;

    const booksService = {
        createBook: vi.fn(),
        getBooks: vi.fn(),
        getBookById: vi.fn(),
        updateBook: vi.fn(),
        deleteBook: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BooksController],
            providers: [{ provide: BooksService, useValue: booksService }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<BooksController>(BooksController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("createBook gọi booksService.createBook", async () => {
        const dto = {
            title: "Clean Code",
            isbn: "9780132350884",
            description: "desc",
            author: "Robert C. Martin",
            category: "Programming",
            price: 150000,
            stockQuantity: 20,
            coverImageUrl: "https://example.com/a.jpg",
        };
        booksService.createBook.mockResolvedValue({ id: 1 });

        await controller.createBook(dto as any);

        expect(booksService.createBook).toHaveBeenCalledWith(dto);
    });

    it("getBooks truyền giá trị phân trang đã được pipe chuyển đổi", async () => {
        booksService.getBooks.mockResolvedValue({ data: [], meta: {} });

        await controller.getBooks({ page: 2, limit: 20 });

        expect(booksService.getBooks).toHaveBeenCalledWith(2, 20);
    });

    it("getBooks dùng giá trị mặc định khi không truyền query param", async () => {
        booksService.getBooks.mockResolvedValue({ data: [], meta: {} });

        await controller.getBooks({});

        expect(booksService.getBooks).toHaveBeenCalledWith(1, 10);
    });

    it("getBookById truyền id sang service", async () => {
        booksService.getBookById.mockResolvedValue({ id: 1 });

        await controller.getBookById(1);

        expect(booksService.getBookById).toHaveBeenCalledWith(1);
    });

    it("updateBook truyền id và dto sang service", async () => {
        const dto = { title: "Clean Code 2nd" };
        booksService.updateBook.mockResolvedValue({ id: 1 });

        await controller.updateBook(1, dto as any);

        expect(booksService.updateBook).toHaveBeenCalledWith(1, dto);
    });

    it("deleteBook truyền id sang service", async () => {
        booksService.deleteBook.mockResolvedValue({ id: 1, status: "INACTIVE" });

        await controller.deleteBook(1);

        expect(booksService.deleteBook).toHaveBeenCalledWith(1);
    });
});
