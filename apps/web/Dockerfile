# Stage 1: Build static web assets using Bun
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json turbo.json ./
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install workspace dependencies
RUN bun install

# Copy source code
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web

# Build arguments for frontend API configuration (defaults to same origin behind Caddy)
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN bun --filter @workspace/ui build 2>/dev/null || true
RUN bun --filter web build

# Stage 2: Serve static files with Caddy
FROM caddy:2-alpine

COPY --from=builder /app/apps/web/dist /usr/share/caddy
COPY apps/web/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

