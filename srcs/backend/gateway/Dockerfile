# Base image for building the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev
RUN npm install -g npm-audit-resolver

# Run security audits
RUN npm audit --production --audit-level=high || echo "Security vulnerabilities found, review required"

# Copy project files
COPY . .

# Production stage with node
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/bash -D nodejs

# Copy only necessary files from builder stage with proper ownership
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# Switch to non-root user for security
USER nodejs

# Set production environment and log level
ENV NODE_ENV=development
ENV LOG_LEVEL=info

# Add metadata labels
LABEL org.opencontainers.image.vendor="Kobayashi Corp."
LABEL org.opencontainers.image.source="https://github.com/Kobayashi82/ft_transcendence"
LABEL org.opencontainers.image.description="API Gateway"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="2025-03-27"
LABEL maintainer="Kobayashi82@outlook.com"

# Node
EXPOSE 3000

# Start the application
CMD ["node", "src/app.js"]
