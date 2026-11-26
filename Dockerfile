# syntax=docker/dockerfile:1
ARG NODE_VERSION=26
ARG BUN_VERSION=1.4.4

FROM node:${NODE_VERSION}-slim AS build
ARG BUN_VERSION
RUN npm install --global bun@${BUN_VERSION}
WORKDIR /repo
COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
RUN bun run --cwd apps/web build

FROM node:${NODE_VERSION}-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    MIGRATIONS_FOLDER=/app/migrations
RUN apt-get update \
 && apt-get install --yes --no-install-recommends git \
 && git config --system --add safe.directory '*' \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.output ./
COPY --from=build --chown=node:node /repo/packages/database/migrations ./migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/auth/ok').then((response) => process.exit(response.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server/index.mjs"]
