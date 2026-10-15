import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service.js";
import { RedisService } from "./redis/redis.service.js";
import { SearchService } from "./search/search.service.js";

@Controller("health")
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly search: SearchService
    ) {}

    @Get()
    async check(): Promise<{ status: string }> {
        try {
            await Promise.all([
                this.prisma.book.findFirst({ select: { status: true } }),
                this.redis.ping(),
                this.search.health(),
            ]);
            return { status: "ok" };
        } catch {
            throw new ServiceUnavailableException("Dependency unavailable");
        }
    }
}
