# ============================================================
# Aegis Bridge — Production Dockerfile
# Multi-stage build for Google Cloud Run deployment
# ============================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Install ALL dependencies for build stage
FROM node:20-alpine AS build-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy source
COPY --from=build-deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app (standalone output for Cloud Run)
ENV NEXT_TELEMETRY_DISABLED=1
RUN node node_modules/next/dist/bin/next build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets (standalone mode)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["node", "server.js"]
