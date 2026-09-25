import { Test, TestingModule } from "@nestjs/testing";
import { CartsService } from "./carts.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

describe("CartsService", () => {
    let service: CartsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CartsService, { provide: PrismaService, useValue: {} }],
        }).compile();

        service = module.get<CartsService>(CartsService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
