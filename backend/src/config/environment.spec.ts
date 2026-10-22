import { describe, expect, it } from "vitest";
import { allowedOrigins, validateEnvironment } from "./environment.js";

const valid = {
    DATABASE_URL: "postgresql://localhost:5432/test",
    JWT_SECRET: "x".repeat(32),
    RABBITMQ_URL: "amqp://localhost:5672",
    RABBITMQ_QUEUE: "test",
    MEILISEARCH_HOST: "http://localhost:7700",
    MEILISEARCH_API_KEY: "test-only",
    CORS_ORIGINS: "http://localhost:3000,https://shop.example.test",
    NODE_ENV: "production",
};

describe("startup configuration", () => {
    it("accepts explicit production origins and required services", () => {
        expect(validateEnvironment(valid)).toBe(valid);
        expect(validateEnvironment({ ...valid, DATABASE_URL: "postgres://localhost:5432/test", RABBITMQ_URL: "amqps://localhost:5671" })).toBeTruthy();
        expect(allowedOrigins(valid.CORS_ORIGINS, "production")).toEqual([
            "http://localhost:3000", "https://shop.example.test",
        ]);
    });
    it("rejects missing secrets, wildcard CORS and malformed service URLs without echoing values", () => {
        expect(() => validateEnvironment({ ...valid, JWT_SECRET: "" })).toThrow("JWT_SECRET is required");
        expect(() => validateEnvironment({ ...valid, CORS_ORIGINS: "*" })).toThrow("CORS_ORIGINS");
        expect(() => validateEnvironment({ ...valid, DATABASE_URL: "broken" })).toThrow("DATABASE_URL is not a valid service URL");
    });
});
