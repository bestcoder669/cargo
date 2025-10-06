FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY libs/prisma/package.json ./libs/prisma/
COPY libs/shared/package.json ./libs/shared/
COPY apps/bot/package.json ./apps/bot/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/libs/prisma/node_modules ./libs/prisma/node_modules
COPY --from=deps /app/libs/shared/node_modules ./libs/shared/node_modules
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules
COPY . .
RUN pnpm --filter @cargoexpress/prisma generate
RUN pnpm --filter @cargoexpress/shared build
RUN pnpm --filter @cargoexpress/bot build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 botuser

COPY --from=builder /app/libs/prisma/dist ./libs/prisma/dist
COPY --from=builder /app/libs/prisma/node_modules/.prisma ./libs/prisma/node_modules/.prisma
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist
COPY --from=builder /app/apps/bot/dist ./apps/bot/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER botuser
WORKDIR /app/apps/bot
CMD ["node", "dist/main.js"]
