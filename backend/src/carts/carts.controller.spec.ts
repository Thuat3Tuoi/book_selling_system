import { Test, TestingModule } from "@nestjs/testing";
import { CartsController } from "./carts.controller.js";
import { CartsService } from "./carts.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

describe("CartsController", () => {
    let controller: CartsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CartsController],
            providers: [{ provide: CartsService, useValue: {} }],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActive: () => true })
        .compile();

        controller = module.get<CartsController>(CartsController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
