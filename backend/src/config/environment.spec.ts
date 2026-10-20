import { validateEnvironment } from "./environment.js";

const valid = {
    DATABASE_URL: "postgresql://example",
    JWT_SECRET: "test-only-secret",
    RABBITMQ_URL: "amqp://example",
    RABBITMQ_QUEUE: "book_queue",
};

describe("environment validation", () => {
    it("fails startup when a required setting is missing", () => {
        expect(() => validateEnvironment({ ...valid, JWT_SECRET: "" })).toThrow("JWT_SECRET");
    });

    it("rejects wildcard and path based credentialed CORS origins", () => {
        expect(() => validateEnvironment({ ...valid, CORS_ORIGINS: "*" })).toThrow("CORS_ORIGINS");
        expect(() => validateEnvironment({ ...valid, CORS_ORIGINS: "https://example.com/path" })).toThrow("CORS_ORIGINS");
        expect(validateEnvironment({ ...valid, CORS_ORIGINS: "https://example.com,http://localhost:3000" }))
            .toMatchObject(valid);
    });
});
