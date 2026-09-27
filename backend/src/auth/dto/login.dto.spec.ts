import { plainToInstance } from "class-transformer"
import { LoginDto } from "./login.dto.js"
import { validate } from "class-validator";


const validPayload = {
    email: "annguyen@example.com",
    password: "123456",
}

async function validateDto(payload: Record<string, unknown>) {
    const dto = plainToInstance(LoginDto, payload);
    return validate(dto);
}

describe("LoginDto", () => {
    it("khong co loi nao khi email va password hop le", async() => {
        const errors = await validateDto(validPayload);
        expect(errors).toHaveLength(0);
    });

    it.each(["email", "password"])("bao loi khi thieu field", async (field) => {
        const payload = { ...validPayload };
        delete (payload as Record<string, unknown>)[field];

        const errors = await validateDto(payload);
        const errorProps = errors.map((e) => e.property);

        expect(errorProps).toContain(field);
    });

    it("bao loi khi email sai dinh dang", async () => {
        const errors = await validateDto({ ...validPayload, email: "not an email"});
        const emailError = errors.find((e) => e.property === "email")

        expect(emailError).toBeDefined();
        expect(emailError?.constraints).toHaveProperty("isEmail");
    });

    it("bao loi khi password ngan hon 6 ki tu", async () => {
        const errors = await validateDto({ ...validPayload, password: "123" });
        const passwordError = errors.find((e) => e.property === "password");

        expect(passwordError).toBeDefined();
        expect(passwordError?.constraints).toHaveProperty("minLength");
    });

    it("email la number bi chan dung kieu", async () => {
        const errors = await validateDto({ ...validPayload, email: 12345 });
        const emailError = errors.find((e) => e.property ==="email");

        expect(emailError).toBeDefined();
    })
})