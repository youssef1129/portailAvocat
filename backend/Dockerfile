# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Prune development dependencies to keep the image slim
RUN npm prune --omit=dev

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Expose the port NestJS runs on
EXPOSE 7501

# Command to run seed and then the app
# CMD ["sh", "-c", "npm run seed:prod && npm run start:prod"]
CMD ["sh", "-c", "npm run start:prod"]