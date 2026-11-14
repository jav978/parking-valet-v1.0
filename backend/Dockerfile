# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build and prisma)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build NestJS
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node dist/main"]
