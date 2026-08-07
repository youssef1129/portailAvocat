# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: Build the application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time only — baked into the client bundle, must point to the PUBLIC
# HTTPS URL the browser will actually call (not an internal Docker hostname).
ARG NEXT_PUBLIC_API_URL=https://youssef-maazouz.stage2-div.rayan-drissi.com
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production server
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Correct permissions for the prerender cache
RUN mkdir .next \
  && chown nextjs:nodejs .next

# output: 'standalone' (next.config.js) produces a minimal server bundle
# with only the deps actually needed at runtime — much smaller image
# than shipping the full node_modules tree.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Internal container port only — never published directly to the host
# in production, always fronted by nginx per the exercise's port range rules.
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]