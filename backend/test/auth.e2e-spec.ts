import { ValidationPipe, type INestApplication } from "@nestjs/common"
import type { App } from "supertest/types.js"
import { PrismaService } from "../src/prisma/prisma.service.js";
import { TestingModule, Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module.js";
import request from "supertest";
import * as bcrypt from "bcrypt";



describe("Auth (e2e)", () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;

    // tao email ngay nhien theo timestamp
    const registerEmail = `test.user.${Date.now()}@example.com`;
    // tao tai khoan rieng de test
    const loginEmail = `test.login.${Date.now()}@example.com`;
    const loginPassword = "123456";


    // khai bao ValidationPipe giong main.ts
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();


        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            })
        );

        await app.init();
        prisma = app.get(PrismaService);

        const passwordHash = await bcrypt.hash(loginPassword, 10);
        await prisma.user.create({
            data: {
                email: loginEmail,
                passwordHash: passwordHash,
                firstName: "Test",
                lastName: "Login",
                role: { connect: { roleName: "CUSTOMER" } },
            },
        });
    });

    // don dep user vua tao test register 
    afterAll(async () => {
        await prisma.user.deleteMany({ 
            where: {
                email: { 
                    in: [registerEmail, loginEmail],
                },
            },
        });
        await app.close();
    });


    // POST /auth/register
    describe("POST /auth/register", () => {
        it("201 - dang ky thanh cong voi payload hop le", () => {
            return request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    firstName: "Test",
                    lastName: "User",
                    email: registerEmail,
                    password: "123456",
                    phoneNumber: "090000000",
                    address: "Test address",
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toEqual({ success: true, data: { message: "User created successfully" } });
                });
        });

        it("assigns CUSTOMER by role name, independent of numeric ID", async () => {
            const createdUer = await prisma.user.findUnique({
                where: { email: registerEmail },
            });
            const customerRole = await prisma.role.findUnique({ where: { roleName: "CUSTOMER" } });
            expect(createdUer).not.toBeNull();
            expect(createdUer?.roleId).toBe(customerRole?.id);
        })

        it("409 - email da ton tai", () => {
            return request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    firstName: "Trung",
                    lastName: "Lap",
                    email: registerEmail,
                    password: "123456",
                })
                .expect(409)
        });


        it("400 - thieu field bat buoc", () => {
            return request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    firstName: "Test",
                    lastName: "User",
                    password: "123456",
                    // thieu email
                })
                .expect(400);
        });

        it("400 - email sai dinh dang", () => {
            return request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    firstName: "Test",
                    lastName: "User",
                    email: "khong-phai-email",
                    password: "123456",
                })
                .expect(400);
        });

        it("400 - gui kem field thua khong khai bao trogng DTO", () => {
            return request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    firstName: "Test",
                    lastName: "User",
                    email: registerEmail,
                    password: "123456",
                    isAdmin: true, // field thua
                })
                .expect(400);
        });
    });


    // POST /auth/login
    describe("POST /auth/login", () => {
        it("200 -  dang nhap thanh cong, tra ve accessToken", () => {
            return request(app.getHttpServer())
                .post("/auth/login")
                .send({ 
                    email: loginEmail,
                    password: loginPassword,
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(typeof res.body.data.accessToken).toBe("string");
                });
        });

        it("401 - thieu email (do LocalAuthGuard chan truoc Pipe, nen khong phai tra loi 401)", () => {
            return request(app.getHttpServer())
                .post("/auth/login")
                .send({ password: loginPassword })
                .expect(401);
        });

        it("401 - thieu password (do LocalAuthGuard chan truoc Pipe, nen khong phai tra loi 401)", () => {
            return request(app.getHttpServer())
                .post("/auth/login")
                .send({ email: loginEmail })
                .expect(401);
        });

        it("401 - sai mat khau", () => {
            return request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: loginEmail,
                    passwort: "sai-mat-khau",
                })
                .expect(401);
        });

        it("401 - email khong ton tai trong DB", () => {
            return request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: "khong.ton.tai@example.com",
                    password: loginPassword
                })
                .expect(401);
        });

        it("400 - email/password dung nhung kem theo field thua (Pipe chan duoc vi Guard da pass", () => {
            return request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: loginEmail,
                    password: loginPassword,
                    isAdmin: true, // field thua
                })
                .expect(400);
        })
    })

    it("limits repeated failed logins from one client IP", async () => {
        const attempt = () => request(app.getHttpServer())
            .post("/auth/login")
            .send({ email: "missing@example.com", password: "incorrect" });
        const first = await attempt();
        expect(first.status).toBe(401);
        let limited = false;
        for (let i = 0; i < 20; i++) {
            const response = await attempt();
            if (response.status === 429) { limited = true; break; }
            expect(response.status).toBe(401);
        }
        expect(limited).toBe(true);
    });
})
