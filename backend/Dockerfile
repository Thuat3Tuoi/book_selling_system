FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --fetch-retries=5

FROM dependencies AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY types ./types
RUN npm run prisma:generate && npm run build

FROM dependencies AS migrate
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM build AS seed
ENV NODE_ENV=development
USER node
CMD ["./node_modules/.bin/tsx", "prisma/seed.ts"]

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund --fetch-retries=5

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
