import { Test, TestingModule } from "@nestjs/testing";
import { CartsService } from "./carts.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";

describe("CartsService", () => {
    let service: CartsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CartsService, 
                { provide: PrismaService, useValue: {} },
                { provide: RedisService, useValue: { get: vi.fn(), set: vi.fn() } },
            ],
        }).compile();

        service = module.get<CartsService>(CartsService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
