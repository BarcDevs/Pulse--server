# ---- Base image
FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- All dependencies (dev included) — for building and dev hot reload
FROM base AS deps
COPY package*.json .npmrc ./
COPY prisma ./prisma
RUN npm ci

# ---- Production dependencies only
FROM base AS deps-prod
COPY package*.json .npmrc ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# ---- Dev: hot reload via tsx
FROM deps AS dev
RUN npx prisma generate --schema=prisma/schema.prisma
COPY . .
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

# ---- Build: compile TypeScript → dist/
# rootDir=. means config/*.ts compiles to dist/config/*.js (config pkg finds them via CWD)
# prisma/generated is in tsconfig's include, so tsc compiles the generated
# client's .ts source (moduleFormat=cjs) straight into dist/prisma/generated —
# no separate copy step needed.
FROM deps AS builder
RUN npx prisma generate --schema=prisma/schema.prisma
COPY . .
RUN npx tsc --project tsconfig.json

# ---- Production runner
FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
# Compiled app + config + prisma generated
COPY --from=builder --chown=node:node /app/dist ./dist
# Prisma schema + migrations for migrate deploy
COPY --from=builder --chown=node:node /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=node:node /app/prisma/migrations ./prisma/migrations
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
USER node
# WORKDIR /app/dist: process.cwd() = /app/dist → config pkg finds dist/config/*.js
WORKDIR /app/dist
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/status || exit 1
# Migrations are NOT run here — running `prisma migrate deploy` on every
# container start races across replicas, and the `prisma` CLI is a
# devDependency (deps-prod installs --omit=dev, so this image doesn't have
# it). Run `npm run release` as a one-off step from the `builder` stage
# instead (has full devDependencies) — e.g.
#   docker build --target builder -t app:migrate .
#   docker run --rm --env-file .env app:migrate npm run release
# before rolling out this image.
CMD ["node", "src/app.js"]
