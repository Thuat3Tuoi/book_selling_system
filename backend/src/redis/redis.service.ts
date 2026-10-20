import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly redis: Redis;
    private cacheReady = false;
    private clearingCache = false;
    private recoveryTimer?: NodeJS.Timeout;

    constructor(private readonly configService: ConfigService) {
        this.redis = new Redis({
            host: this.configService.get<string>("REDIS_HOST", "localhost"),
            port: this.configService.get<number>("REDIS_PORT", 6379),
            password: this.configService.get<string>("REDIS_PASSWORD") || undefined,
            connectTimeout: 1000,
            commandTimeout: 1000,
            maxRetriesPerRequest: 1,
        });
        this.redis.on("error", (error: Error) => this.logger.warn(`Redis: ${error.message}`));
        this.redis.on("close", () => { this.cacheReady = false; });
        this.redis.on("ready", () => { void this.clearApplicationCaches(); });
    }

    async onModuleInit() {
        try {
            await this.ping();
        } catch (error) {
            this.logger.warn(`Cache unavailable at startup: ${(error as Error).message}`);
        }
    }

    async ping(): Promise<void> {
        if (await this.redis.ping() !== "PONG") {
            throw new Error("Redis unavailable");
        }
    }

    async onModuleDestroy() {
        if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
        this.redis.disconnect();
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.cacheReady) return null;
        try {
            const value = await this.redis.get(key);

            return value === null ? null : JSON.parse(value) as T;
        } catch (error) {
            this.cacheReady = false;
            this.scheduleRecovery();
            this.logger.warn(`Cache read failed (${key}): ${(error as Error).message}`);
            return null;
        }
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        if (!this.cacheReady) return;
        try {
            const data = JSON.stringify(value);
            if (ttlSeconds) {
                await this.redis.set(key, data, "EX", ttlSeconds);
            } else {
                await this.redis.set(key, data);
            }
        } catch (error) {
            this.cacheReady = false;
            this.scheduleRecovery();
            this.logger.warn(`Cache write failed (${key}): ${(error as Error).message}`);
        }
    }

    async delete(key: string): Promise<void> {
        await this.deleteMany(key);
    }

    async deleteMany(...keys: string[]): Promise<void> {
        if (keys.length === 0) {
            return;
        }

        try {
            await this.redis.del(...keys);
        } catch (error) {
            this.cacheReady = false;
            this.scheduleRecovery();
            this.logger.warn(`Cache invalidation failed: ${(error as Error).message}`);
        }
    }

    async deleteByPrefix(prefix: string): Promise<void> {
        try {
            let cursor = "0";
            do {
                const [next, keys] = await this.redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
                if (keys.length) await this.redis.del(...keys);
                cursor = next;
            } while (cursor !== "0");
        } catch (error) {
            this.cacheReady = false;
            this.scheduleRecovery();
            this.logger.warn(`Cache invalidation failed (${prefix}): ${(error as Error).message}`);
        }
    }

    async getRevision(key: string): Promise<number | null> {
        if (!this.cacheReady) return null;
        try {
            return Number(await this.redis.get(key) ?? 0);
        } catch (error) {
            this.cacheReady = false;
            this.scheduleRecovery();
            this.logger.warn(`Cache revision read failed (${key}): ${(error as Error).message}`);
            return null;
        }
    }

    async incrementRevision(key: string): Promise<void> {
        try {
            await this.redis.incr(key);
        } catch (error) {
            this.cacheReady = false;
            this.scheduleRecovery();
            this.logger.warn(`Cache revision update failed (${key}): ${(error as Error).message}`);
        }
    }

    private async clearApplicationCaches(): Promise<void> {
        if (this.clearingCache) return;
        this.clearingCache = true;
        this.cacheReady = false;
        try {
            for (const prefix of ["books:page:", "book:", "cart:user:"]) {
                let cursor = "0";
                do {
                    const [next, keys] = await this.redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
                    if (keys.length) await this.redis.del(...keys);
                    cursor = next;
                } while (cursor !== "0");
            }
            this.cacheReady = true;
        } catch (error) {
            this.logger.warn(`Could not clear cache after Redis reconnect: ${(error as Error).message}`);
            this.scheduleRecovery();
        } finally {
            this.clearingCache = false;
        }
    }

    private scheduleRecovery(): void {
        if (this.recoveryTimer) return;
        this.recoveryTimer = setTimeout(() => {
            this.recoveryTimer = undefined;
            if (this.redis.status === "ready") void this.clearApplicationCaches();
            else this.scheduleRecovery();
        }, 1000);
    }

    async withLock(key: string, ttlSeconds: number, task: () => Promise<void>): Promise<boolean> {
        const token = randomUUID();
        try {
            const acquired = await this.redis.set(key, token, "EX", ttlSeconds, "NX");
            if (acquired !== "OK") return false;
        } catch (error) {
            this.logger.warn(`Lock unavailable (${key}): ${(error as Error).message}`);
            return false;
        }
        try {
            await task();
        } finally {
            await this.redis.eval(
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                1, key, token,
            ).catch((error: Error) => this.logger.warn(`Lock release failed: ${error.message}`));
        }
        return true;
    }
}
