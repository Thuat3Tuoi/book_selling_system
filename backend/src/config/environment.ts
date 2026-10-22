export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
    for (const key of ["DATABASE_URL", "JWT_SECRET", "RABBITMQ_URL", "RABBITMQ_QUEUE"]) {
        if (typeof config[key] !== "string" || !config[key].trim()) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
    }

    const origins = config.CORS_ORIGINS;
    if (origins !== undefined) {
        if (typeof origins !== "string" || !origins.trim()) {
            throw new Error("CORS_ORIGINS must contain at least one origin");
        }
        for (const value of origins.split(",")) {
            let url: URL;
            try {
                url = new URL(value.trim());
            } catch {
                throw new Error("CORS_ORIGINS must contain valid origins");
            }
            if (!["http:", "https:"].includes(url.protocol) || url.origin !== value.trim()) {
                throw new Error("CORS_ORIGINS must contain origins without paths");
            }
        }
    }
    return config;
}
