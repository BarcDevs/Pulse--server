# ---- Base image
FROM node:20-bullseye-slim AS base
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
FROM deps AS builder
RUN npx prisma generate --schema=prisma/schema.prisma
COPY . .
RUN npx tsc --project tsconfig.json
# Prisma imports resolve relative to file: dist/src/... → dist/prisma/generated
RUN cp -r prisma/generated dist/prisma/

# ---- Production runner
FROM node:20-bullseye-slim AS runner
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps-prod /app/node_modules ./node_modules
# Compiled app + config + prisma generated
COPY --from=builder /app/dist ./dist
# Prisma schema + migrations for migrate deploy
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/migrations ./prisma/migrations
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
# WORKDIR /app/dist: process.cwd() = /app/dist → config pkg finds dist/config/*.js
WORKDIR /app/dist
CMD ["sh", "-c", "npx prisma migrate deploy --schema /app/prisma/schema.prisma && node src/app.js"]
