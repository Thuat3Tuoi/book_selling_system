import {
    BadRequestException,
    Controller,
    Get,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    type INestApplication,
} from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ResponseEnvelopeExceptionFilter } from "./filters/response-envelope-exception.filter.js";
import { ResponseEnvelopeInterceptor } from "./interceptors/response-envelope.interceptor.js";

@Controller("example")
class ExampleController {
    @Get()
    list() {
        return { data: [{ id: 1 }], meta: { page: 1, total: 1 } };
    }

    @Get("item/:id")
    item(@Param("id", ParseIntPipe) id: number) {
        return { id };
    }

    @Post()
    create() {
        return { id: 2 };
    }

    @Get("invalid")
    invalid() {
        throw new BadRequestException(["invalid value"]);
    }

    @Get("broken")
    broken() {
        throw new Error("secret implementation detail");
    }
}

describe("HTTP response envelope", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [ExampleController],
            providers: [
                { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
                { provide: APP_FILTER, useClass: ResponseEnvelopeExceptionFilter },
            ],
        }).compile();
        app = module.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it("wraps list data and keeps pagination metadata", async () => {
        const response = await request(app.getHttpServer()).get("/example").expect(HttpStatus.OK);
        expect(response.body).toEqual({
            success: true,
            data: [{ id: 1 }],
            meta: { page: 1, total: 1 },
        });
    });

    it("preserves success status codes", async () => {
        const response = await request(app.getHttpServer())
            .post("/example")
            .expect(HttpStatus.CREATED);
        expect(response.body).toEqual({ success: true, data: { id: 2 } });
    });

    it("wraps validation errors without changing their status", async () => {
        const response = await request(app.getHttpServer())
            .get("/example/invalid")
            .expect(HttpStatus.BAD_REQUEST);
        expect(response.body).toEqual({
            success: false,
            error: { statusCode: 400, message: "Validation failed", details: ["invalid value"] },
        });
    });

    it("hides unexpected error details", async () => {
        const response = await request(app.getHttpServer())
            .get("/example/broken")
            .expect(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body).toEqual({
            success: false,
            error: { statusCode: 500, message: "Internal server error" },
        });
    });
});
