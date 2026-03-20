# ============================================================
# Aegis Bridge — Production Dockerfile
# Google Cloud Run deployment
# ============================================================

FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files and install all deps (needed for build)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build-time ARGs for NEXT_PUBLIC_ vars (embedded into client bundle by Next.js)
# Passed via --build-arg in gcloud run deploy or Cloud Build
ARG NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDZeE9K3XTrx419korCDK-wOHZzWen_f7k
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=promptwars-65e18.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=promptwars-65e18
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=promptwars-65e18.firebasestorage.app
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=645196531653
ARG NEXT_PUBLIC_FIREBASE_APP_ID=1:645196531653:web:36d359d5aca7b4a26cedac
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCM3c9IplmD7NAtiFRBfYkMINR0E4b2IFk

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js (standalone output)
RUN node node_modules/next/dist/bin/next build

# ── Production runner ──────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
