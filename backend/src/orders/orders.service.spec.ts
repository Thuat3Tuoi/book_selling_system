import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma.service.js";
import { OrdersService } from "./orders.service.js";

describe("OrdersService", () => {
    let service: OrdersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OrdersService, { provide: PrismaService, useValue: {} }],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
