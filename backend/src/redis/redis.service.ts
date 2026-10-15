import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly redis: Redis;

    constructor(private readonly configService: ConfigService) {
        this.redis = new Redis({
            host: this.configService.get<string>("REDIS_HOST", "localhost"),
            port: this.configService.get<number>("REDIS_PORT", 6379),
            password: this.configService.get<string>("REDIS_PASSWORD") || undefined,
        });
    }

    async onModuleInit() {
        await this.ping();
    }

    async ping(): Promise<void> {
        if (await this.redis.ping() !== "PONG") {
            throw new Error("Redis unavailable");
        }
    }

    async onModuleDestroy() {
        await this.redis.quit();
    }

    async get<T>(key: string): Promise<T | null> {
        const value = await this.redis.get(key);

        if (!value) {
            return null;
        }

        return JSON.parse(value) as T;
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        const data = JSON.stringify(value);

        if (ttlSeconds) {
            await this.redis.set(key, data, "EX", ttlSeconds);
            return;
        }

        await this.redis.set(key, data);
    }

    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async deleteMany(...keys: string[]): Promise<void> {
        if (keys.length === 0) {
            return;
        }

        await this.redis.del(...keys);
    }
}
