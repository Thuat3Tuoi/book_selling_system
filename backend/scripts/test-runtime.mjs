// Starts the built API, runs every E2E suite against it, then stops only that API.
// Dependencies must point to an isolated, migrated and seeded test environment.
import "dotenv/config";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

if (process.env.E2E_ISOLATED_DB !== "YES" || !process.env.DATABASE_URL) {
    throw new Error("Runtime tests require E2E_ISOLATED_DB=YES and dedicated service configuration");
}
if (!(process.env.E2E_SAMPLE_PASSWORD || process.env.SEED_DEFAULT_PASSWORD)) {
    throw new Error("Set SEED_DEFAULT_PASSWORD to the password used to seed the test database");
}

const cwd = fileURLToPath(new URL("../", import.meta.url));
const port = await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
        const assigned = probe.address().port;
        probe.close((error) => error ? reject(error) : resolve(assigned));
    });
});
const env = {
    ...process.env,
    PORT: String(port),
    E2E_BASE_URL: "http://127.0.0.1:" + port,
    E2E_ALLOWED_ORIGIN: process.env.E2E_ALLOWED_ORIGIN ||
        process.env.CORS_ORIGINS?.split(",")[0].trim() || "http://localhost:3000",
};
const api = spawn(process.execPath, ["dist/main.js"], { cwd, env, stdio: "inherit" });
let startupError;
api.once("error", (error) => { startupError = error; });
let activeCheck;
const interrupt = () => {
    activeCheck?.kill("SIGTERM");
    api.kill("SIGTERM");
    process.exitCode = 130;
};
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

async function run(script, args = []) {
    const child = spawn(process.execPath, [script, ...args], { cwd, env, stdio: "inherit" });
    activeCheck = child;
    await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => {
            if (code === 0) resolve();
            else reject(new Error(script + " failed (" + (signal || code) + ")"));
        });
    });
    activeCheck = undefined;
}

try {
    const deadline = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < deadline) {
        if (startupError) throw startupError;
        if (api.exitCode !== null || api.signalCode !== null || process.exitCode === 130) {
            throw new Error("Test API stopped before becoming ready");
        }
        try {
            const response = await fetch(env.E2E_BASE_URL + "/health", { signal: AbortSignal.timeout(2000) });
            if (response.ok) { ready = true; break; }
        } catch { /* The API is still starting. */ }
        await delay(500);
    }
    if (!ready) throw new Error("Test API did not become healthy within 90 seconds");
    await run("node_modules/vitest/vitest.mjs", ["run", "--config", "vitest.config.e2e.ts"]);
    await run("scripts/verify-rabbit-events.mjs");
    await run("scripts/explain-orders.mjs");
} catch (error) {
    console.error(error.message);
    process.exitCode = process.exitCode || 1;
} finally {
    if (api.exitCode === null && api.signalCode === null) {
        const stopped = new Promise((resolve) => api.once("exit", resolve));
        api.kill("SIGTERM");
        const forceStop = setTimeout(() => api.kill("SIGKILL"), 5000);
        forceStop.unref();
        await stopped;
        clearTimeout(forceStop);
    }
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
}
