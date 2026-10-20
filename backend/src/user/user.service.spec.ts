import { describe, expect, it, vi } from "vitest";
import { UserService } from "./user.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

describe("registration role assignment", () => {
    it("connects the CUSTOMER role by name instead of assuming a role ID", async () => {
        const user = {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 1 }),
        };
        const service = new UserService({ user } as unknown as PrismaService);
        await service.createUser({
            firstName: "Test", lastName: "User", email: "new@example.test",
            password: "example-password", phoneNumber: "", address: "",
        });
        expect(user.create).toHaveBeenCalledWith({ data: expect.objectContaining({
            role: { connect: { roleName: "CUSTOMER" } },
        }) });
    });
});
