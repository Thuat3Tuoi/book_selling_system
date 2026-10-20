export function allowedOrigins(value: string | undefined, nodeEnv: string | undefined): string[] {
    const configured = value?.trim() || (nodeEnv === "production" ? "" : "http://localhost:3000");
    const origins = configured.split(",").map((origin) => origin.trim()).filter(Boolean);
    if (origins.length === 0 || origins.some((origin) => {
        try {
            const url = new URL(origin);
            return origin === "*" || !["http:", "https:"].includes(url.protocol) ||
                url.origin !== origin || Boolean(url.username || url.password);
        } catch {
            return true;
        }
    })) {
        throw new Error("CORS_ORIGINS must contain explicit HTTP(S) origins separated by commas");
    }
    return origins;
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
    for (const name of ["DATABASE_URL", "JWT_SECRET", "RABBITMQ_URL", "RABBITMQ_QUEUE", "MEILISEARCH_HOST"]) {
        if (typeof config[name] !== "string" || !String(config[name]).trim()) {
            throw new Error(`${name} is required`);
        }
    }
    const protocols = {
        DATABASE_URL: ["postgresql:", "postgres:"],
        RABBITMQ_URL: ["amqp:", "amqps:"],
        MEILISEARCH_HOST: ["http:", "https:"],
    };
    for (const [name, allowed] of Object.entries(protocols)) {
        try {
            const url = new URL(String(config[name]));
            if (!allowed.includes(url.protocol)) {
                throw new Error();
            }
        } catch {
            throw new Error(`${name} is not a valid service URL`);
        }
    }
    if (config.NODE_ENV === "production") {
        if (String(config.JWT_SECRET).length < 32) throw new Error("JWT_SECRET must be at least 32 characters in production");
        if (!config.MEILISEARCH_API_KEY) throw new Error("MEILISEARCH_API_KEY is required in production");
    }
    allowedOrigins(config.CORS_ORIGINS as string | undefined, config.NODE_ENV as string | undefined);
    return config;
}
