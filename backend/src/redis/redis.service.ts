import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly redis: Redis;
    private readonly pendingKeys = new Set<string>();
    private readonly pendingPatterns = new Set<string>();
    private pendingFlush?: Promise<void>;

    constructor(private readonly configService: ConfigService) {
        this.redis = new Redis({
            host: this.configService.get<string>("REDIS_HOST", "localhost"),
            port: this.configService.get<number>("REDIS_PORT", 6379),
            password: this.configService.get<string>("REDIS_PASSWORD") || undefined,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            connectTimeout: 1000,
        });
    }

    async onModuleInit() {
        try {
            await this.ping();
        } catch {
            this.logger.warn("Redis unavailable at startup; cache will be bypassed");
        }
    }

    async ping(): Promise<void> {
        if (await this.redis.ping() !== "PONG") {
            throw new Error("Redis unavailable");
        }
    }

    async onModuleDestroy() {
        this.redis.disconnect();
    }

    async get<T>(key: string): Promise<T | null> {
        if (!await this.flushInvalidations()) {
            return null;
        }
        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) as T : null;
        } catch {
            return null;
        }
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        if (!await this.flushInvalidations()) return;
        const data = JSON.stringify(value);
        try {
            if (ttlSeconds) {
                await this.redis.set(key, data, "EX", ttlSeconds);
            } else {
                await this.redis.set(key, data);
            }
        } catch {
            this.logger.warn("Redis cache write skipped while unavailable");
        }
    }

    async delete(key: string): Promise<void> {
        this.pendingKeys.add(key);
        await this.flushInvalidations();
    }

    async deleteMany(...keys: string[]): Promise<void> {
        for (const key of keys) this.pendingKeys.add(key);
        await this.flushInvalidations();
    }

    async deleteByPattern(pattern: string): Promise<void> {
        this.pendingPatterns.add(pattern);
        await this.flushInvalidations();
    }

    private async flushInvalidations(): Promise<boolean> {
        if (this.pendingFlush) {
            try {
                await this.pendingFlush;
            } catch {
                return false;
            }
        }
        if (this.pendingKeys.size === 0 && this.pendingPatterns.size === 0) return true;

        this.pendingFlush = this.deletePending();
        try {
            await this.pendingFlush;
            return true;
        } catch {
            this.logger.warn("Redis invalidation postponed until the cache reconnects");
            return false;
        } finally {
            this.pendingFlush = undefined;
        }
    }

    private async deletePending(): Promise<void> {
        for (const key of this.pendingKeys) {
            await this.redis.del(key);
            this.pendingKeys.delete(key);
        }
        for (const pattern of this.pendingPatterns) {
            await this.deletePattern(pattern);
            this.pendingPatterns.delete(pattern);
        }
    }

    private async deletePattern(pattern: string): Promise<void> {
        let cursor = "0";
        do {
            const [next, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
            if (keys.length) await this.redis.del(...keys);
            cursor = next;
        } while (cursor !== "0");
    }
}
