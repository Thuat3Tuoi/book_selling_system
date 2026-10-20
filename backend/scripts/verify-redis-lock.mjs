// Uses the real Redis connection configured by verify-isolated.ps1.
import { RedisService } from "../dist/redis/redis.service.js";

const config = {
    get(key, fallback) {
        if (key === "REDIS_PORT") return Number(process.env.REDIS_PORT ?? fallback);
        return process.env[key] ?? fallback;
    },
};
const first = new RedisService(config);
const second = new RedisService(config);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let started;
const taskStarted = new Promise((resolve) => { started = resolve; });

try {
    await Promise.all([first.onModuleInit(), second.onModuleInit()]);
    const running = first.withLock("review:renewing-lock", 1, async (signal) => {
        started();
        await sleep(1800);
        signal.throwIfAborted();
    });
    await taskStarted;
    await sleep(1200);
    const overlap = await second.withLock("review:renewing-lock", 1, async () => {});
    const firstAcquired = await running;
    const acquiredAfterRelease = await second.withLock("review:renewing-lock", 1, async () => {});
    console.log(JSON.stringify({ firstAcquired, overlap, acquiredAfterRelease }));
    if (!firstAcquired || overlap || !acquiredAfterRelease) {
        throw new Error("Redis lock did not prevent an overlapping job");
    }
} finally {
    await Promise.all([first.onModuleDestroy(), second.onModuleDestroy()]);
}
