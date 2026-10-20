import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { BooksController } from "./books.controller.js";
import { BooksService } from "./books.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { RolesGuard } from "../guards/roles.guard.js";

describe("Books HTTP access and validation", () => {
    let app: INestApplication;
    const booksService = {
        getBooks: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
        getBookById: vi.fn(),
        createBook: vi.fn().mockResolvedValue({ id: 1 }),
        updateBook: vi.fn(),
        deleteBook: vi.fn(),
    };

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [BooksController],
            providers: [{ provide: BooksService, useValue: booksService }, RolesGuard],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate(context: ExecutionContext) {
                    const req = context.switchToHttp().getRequest();
                    const roleName = req.headers.authorization?.replace("Bearer ", "");
                    if (!roleName) throw new UnauthorizedException();
                    req.user = { id: 1, role: { roleName } };
                    return true;
                },
            } satisfies CanActivate)
            .compile();
        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();
    });

    afterAll(async () => app.close());

    it("keeps book listing public and rejects invalid pagination", async () => {
        await request(app.getHttpServer()).get("/books?page=1&limit=10").expect(200);
        await request(app.getHttpServer()).get("/books?page=0").expect(400);
        await request(app.getHttpServer()).get("/books?limit=101").expect(400);
    });

    it("protects book creation and validates the body", async () => {
        const book = {
            title: "Clean Code", isbn: "9780132350884", description: "Book", author: "Robert C. Martin",
            category: "Programming", price: 100, stockQuantity: 3, coverImageUrl: "https://example.com/book.jpg",
        };
        await request(app.getHttpServer()).post("/books").send(book).expect(401);
        await request(app.getHttpServer()).post("/books").set("Authorization", "Bearer CUSTOMER").send(book).expect(403);
        await request(app.getHttpServer()).post("/books").set("Authorization", "Bearer ADMIN").send({ ...book, price: -1 }).expect(400);
        booksService.createBook.mockResolvedValueOnce({
            ...book, id: 1, status: "ACTIVE", createdAt: new Date(), updatedAt: new Date(),
            internalSecret: "must-not-leak",
        });
        const response = await request(app.getHttpServer())
            .post("/books").set("Authorization", "Bearer ADMIN").send(book).expect(201);
        expect(response.body.price).toBe("100");
        expect(response.body).not.toHaveProperty("internalSecret");
        expect(booksService.createBook).toHaveBeenCalledWith(expect.objectContaining(book));
    });
});
