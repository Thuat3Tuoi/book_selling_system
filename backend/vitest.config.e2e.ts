import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
        root: "./",
        include: ["**/*.e2e-spec.ts"],
        setupFiles: ["./test/e2e-safety.ts"],
        // The suites share a database, Redis cache and scheduled workers.
        fileParallelism: false,
    },
});
