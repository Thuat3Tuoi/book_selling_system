import { Test, TestingModule } from "@nestjs/testing";
import { BooksController } from "./books.controller.js";
import { BooksService } from "./books.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

describe("BooksController", () => {
    let controller: BooksController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BooksController],
            providers: [{ provide: BooksService, useValue: {} }],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({  canActivate: () => true })
        .compile();

        controller = module.get<BooksController>(BooksController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
