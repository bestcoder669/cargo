FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY libs/shared/package.json ./libs/shared/
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/libs/shared/node_modules ./libs/shared/node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules
COPY . .
RUN pnpm --filter @cargoexpress/shared build
RUN pnpm --filter @cargoexpress/admin build

# Runner stage
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
