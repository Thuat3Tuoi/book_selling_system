import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import starterConfig from "./vitest.config.js";

export default mergeConfig(starterConfig, defineConfig({
    resolve: {
        alias: {
            "lab-consumer": fileURLToPath(new URL("./solution/consumer.ts", import.meta.url)),
        },
    },
}));
