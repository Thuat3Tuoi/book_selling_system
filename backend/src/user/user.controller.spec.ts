import { Test } from "@nestjs/testing";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";

describe("UserController", () => {
    it("uses the validated user id and omits private fields", async () => {
        const userService = {
            findUserById: vi.fn().mockResolvedValue({
                id: 7, firstName: "A", lastName: "B", email: "a@example.com",
                phoneNumber: null, address: null, roleId: 2, passwordHash: "private",
            }),
        };
        const module = await Test.createTestingModule({
            controllers: [UserController],
            providers: [{ provide: UserService, useValue: userService }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();
        const controller = module.get(UserController);
        const result = await controller.getMe({ user: { id: 7 } } as any);
        expect(userService.findUserById).toHaveBeenCalledWith(7);
        expect(result).not.toHaveProperty("passwordHash");
    });
});
