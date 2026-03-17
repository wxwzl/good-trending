# Base stage
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/dto/package.json ./packages/dto/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY apps/scheduler/package.json ./apps/scheduler/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/dto/node_modules ./packages/dto/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/scheduler/node_modules ./apps/scheduler/node_modules

# Copy source code
COPY . .

# Build packages
RUN pnpm --filter @good-trending/dto build
RUN pnpm --filter @good-trending/database build

# Build applications
RUN pnpm --filter @good-trending/api build
RUN pnpm --filter @good-trending/web build
RUN pnpm --filter @good-trending/scheduler build

# Production stage for API
FROM node:20-alpine AS api-runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ENV NODE_ENV=production
ENV APP_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api

# Copy built application and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/dto/dist ./packages/dto/dist
COPY --from=builder /app/packages/dto/package.json ./packages/dto/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

USER api

EXPOSE 3015

ENV API_PORT=3015

CMD ["node", "apps/api/dist/main.js"]

# Production stage for web
FROM node:20-alpine AS web-runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ENV NODE_ENV=production
ENV APP_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

USER nextjs

EXPOSE 3010

ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# Production stage for scheduler
FROM node:20-alpine AS scheduler-runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ENV NODE_ENV=production
ENV APP_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 scheduler

# Copy built application and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/dto/dist ./packages/dto/dist
COPY --from=builder /app/packages/dto/package.json ./packages/dto/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/apps/scheduler/dist ./apps/scheduler/dist
COPY --from=builder /app/apps/scheduler/package.json ./apps/scheduler/package.json

USER scheduler

CMD ["node", "apps/scheduler/dist/main.js"]
