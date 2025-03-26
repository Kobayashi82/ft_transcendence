# Base image for building the application
FROM node:20 AS builder

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy project files
COPY . .

# Production stage with node
FROM node:20

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Copy only necessary files from builder stage with proper ownership
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# Switch to non-root user for security
USER nodejs

# Set production environment and log level
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Node
EXPOSE 3000

# Start the application
CMD ["node", "src/app.js"]
