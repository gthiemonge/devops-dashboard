# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm ci

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build all packages
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies for backend
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Create minimal package.json for frontend (no deps needed at runtime)
RUN mkdir -p frontend && echo '{"name":"@dashboard/frontend","version":"1.0.0"}' > frontend/package.json

RUN npm ci --omit=dev --workspace=@dashboard/backend --workspace=@dashboard/shared

# Copy built artifacts
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./backend/dist/public

# Copy database schema for initialization
COPY backend/src/db/schema.sql ./backend/dist/db/

# Create data and logs directories
RUN mkdir -p /app/backend/data /app/backend/logs && chown -R node:node /app/backend/data /app/backend/logs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Run as non-root user
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
