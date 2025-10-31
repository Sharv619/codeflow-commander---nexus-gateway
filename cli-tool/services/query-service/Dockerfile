# ------------------------------------------------------------------------------
# EKG Query Service Dockerfile
# Multi-stage build for production-optimized GraphQL API container
# ------------------------------------------------------------------------------


# ------------------------------------------------------------------------------
# Stage 1: Builder - Install dependencies and compile TypeScript
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build the application
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Image - Lightweight runtime container
# ------------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install curl for health checks (commonly used in Kubernetes)
RUN apk add --no-cache curl

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ekg -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=ekg:nodejs /app/dist ./dist/
COPY --from=builder --chown=ekg:nodejs /app/src/schemas ./src/schemas/
COPY --from=builder --chown=ekg:nodejs /app/node_modules ./node_modules/
COPY --from=builder --chown=ekg:nodejs /app/package*.json ./

# Create temporary directories for caching and logging
# Set proper permissions and ownership
RUN mkdir -p /tmp/cache && \
    chown -R ekg:nodejs /tmp/cache && \
    chgrp -R nodejs /tmp/cache

# Switch to non-root user
USER ekg

# Expose port
EXPOSE 4000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Set production environment
ENV NODE_ENV=production
ENV GRAPHQL_PLAYGROUND=false

# Start the application
CMD ["node", "dist/server.js"]
