# syntax=docker/dockerfile:1.7
# Multi-stage Next.js + Prisma build. Targets Fly.io / Railway / generic Docker hosts.
# For Vercel, ignore this file — Vercel builds from package.json directly.

# ─── Dependencies ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Use npm ci for reproducible installs; ignore-scripts to skip the prisma generate
# until we copy the schema in the build stage.
RUN npm ci --ignore-scripts

# ─── Build ────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client + Next.js build
RUN npx prisma generate
# Skip the prebuild env check inside Docker — env vars are injected at runtime
RUN node --version && npm pkg delete scripts.prebuild
RUN npm run build

# ─── Runtime ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Run as non-root
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Required at runtime for Prisma's query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000

# Run migrations on boot, then start the server.
# If you'd rather migrate as a separate release step, change CMD to `npm start`.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
