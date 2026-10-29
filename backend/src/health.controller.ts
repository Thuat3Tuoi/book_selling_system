import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service.js";
import { RedisService } from "./redis/redis.service.js";
import { SearchService } from "./search/search.service.js";
import { HealthStatus } from "./common/health-status.enum.js";
import { ApiTags } from "@nestjs/swagger";
import { ApiEnvelopeResponse } from "./common/api-envelope.decorator.js";
import { HealthResponseDto } from "./common/dto/health-response.dto.js";

@ApiTags("Health")
@Controller("health")
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly search: SearchService
    ) {}

    @Get()
    @ApiEnvelopeResponse(200, HealthResponseDto)
    async check(): Promise<{ status: HealthStatus }> {
        try {
            await Promise.all([
                this.prisma.book.findFirst({ select: { status: true } }),
                this.redis.ping(),
                this.search.health(),
            ]);
            return { status: HealthStatus.OK };
        } catch {
            throw new ServiceUnavailableException("Dependency unavailable");
        }
    }
}
