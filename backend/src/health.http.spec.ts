import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { HealthController } from "./health.controller.js";
import { PrismaService } from "./prisma/prisma.service.js";
import { RedisService } from "./redis/redis.service.js";
import { SearchService } from "./search/search.service.js";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor.js";

describe("Health HTTP response", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                { provide: PrismaService, useValue: { book: { findFirst: vi.fn().mockResolvedValue(null) } } },
                { provide: RedisService, useValue: { ping: vi.fn().mockResolvedValue("PONG") } },
                { provide: SearchService, useValue: { health: vi.fn().mockResolvedValue(undefined) } },
            ],
        }).compile();
        app = module.createNestApplication();
        app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
        await app.init();
    });

    afterAll(async () => app.close());

    it("returns the documented healthy response envelope", async () => {
        await request(app.getHttpServer())
            .get("/health")
            .expect(200, { success: true, data: { status: "ok" } });
    });
});
