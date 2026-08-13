# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy backend source code
COPY backend/ ./

# Generate Prisma client and build NestJS
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app/backend

ENV NODE_ENV=production

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY --from=builder /app/backend/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node dist/main"]
