import { Test, TestingModule } from "@nestjs/testing";

import { OrdersService } from "./orders.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BooksService } from "../books/books.service.js";

describe("OrdersService", () => {
    let service: OrdersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OrdersService, 
                { provide: PrismaService, useValue: {} },
                { provide: BooksService, useValue: {} },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
