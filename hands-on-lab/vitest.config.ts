import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    root: fileURLToPath(new URL(".", import.meta.url)),
    resolve: {
        alias: {
            "lab-consumer": fileURLToPath(new URL("./starter/consumer.ts", import.meta.url)),
        },
    },
    test: {
        include: ["tests/**/*.spec.ts"],
        environment: "node",
    },
});
