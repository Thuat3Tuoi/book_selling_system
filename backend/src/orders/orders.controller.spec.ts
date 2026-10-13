import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

describe("OrdersController", () => {
    let controller: OrdersController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrdersController],
            providers: [{ provide: OrdersService, useValue: {} }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<OrdersController>(OrdersController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
