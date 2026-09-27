import { plainToInstance } from "class-transformer";
import { CreateUserDto } from "./create-user.dto.js";
import { validate } from "class-validator";


const validPayload = {
    firstName: "An",
    lastName: "Nguyen",
    email: "an.nguyen@example.com",
    password: "123456",
    phoneNumber: "0123456789",
    address: "273 An Duong Vuong, Ho Chi Minh",
};

async function validateDto(payload: Record<string, unknown>) {
    const dto = plainToInstance(CreateUserDto, payload);
    return validate(dto);
}

describe("CreateUserDto", () => {
    describe("payload hop le", () => {
        it("khong co loi validate nao khi dung va du tat ca field bat buoc", async () => {
            const errors = await validateDto(validPayload);
            expect(errors).toHaveLength(0);
        });

        it("van hop le khi bo trong field optinal (phoneNumber, address", async () => {
            const {phoneNumber, address, ...rest} = validPayload;
            const errors = await validateDto(rest);
            expect(errors).toHaveLength(0);
        });
    });

    describe("thieu truong bat buoc", () => {
        it.each(["firstName", "lastName", "email", "password"])(
            "bao loi khi thieu field",
            async (field) => {
                const payload = { ...validPayload };
                delete (payload as Record<string, unknown>)[field];

                const errors = await validateDto(payload);
                const errorProps = errors.map((e) => e.property);

                expect(errorProps).toContain(field);
            }
        );

        it ("bao loi khi tat ca cac field deu trong", async () => {
            const errors = await validateDto({});
            const errorProps = errors.map((e) => e.property);

            expect(errorProps).toEqual(
                expect.arrayContaining(["firstName", "lastName", "email", "password"])
            );
        });
    });

    describe("sai dinh dang du lieu", () => {
        it("bao loi khi email sai dinh dang", async () => {
            const errors = await validateDto({ ...validPayload, email: "khong phai email"});
            const emailError = errors.find((e) => e.property === "email");

            expect(emailError).toBeDefined();
            expect(emailError?.constraints).toHaveProperty("isEmail");
        });

        it("bao loi khi password ngan hon 6 ki tu", async () => {
            const errors = await validateDto({ ...validPayload, password: "123" });
            const passwordError = errors.find((e) => e.property === "password");
            expect (passwordError).toBeDefined();
            expect (passwordError?.constraints).toHaveProperty("minLength");
        });
    });

    describe("sai kieu du lieu", () => {
        it.each(["firstName", "lastName", "password", "phoneNumber", "address"])("bao loi 'isString' khi filed la number thay vi string", async (field) => {
                const errors = await validateDto({ ...validPayload, [field]: 123456 });
                const fieldError = errors.find((e) => e.property === field);

                expect(fieldError).toBeDefined();
                expect(fieldError?.constraints).toHaveProperty("isString");
            }
        );

        it("email la number thi bi chan", async () => {
            const errors = await validateDto({ ...validPayload, email: 123456 });
            const emailError = errors.find((e) => e.property === "email");

            expect(emailError).toBeDefined();
            expect(emailError?.constraints).toHaveProperty("isEmail");
        });

        it("firstName la boolean thi bi chan sai", async () => {
            const errors = await validateDto({ ...validPayload, firstName: true });
            const firstNameError = errors.find((e) => e.property === "firstName");

            expect(firstNameError).toBeDefined();
            expect(firstNameError?.constraints).toHaveProperty("isString");
        });
    })


})