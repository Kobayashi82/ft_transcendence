# Base image for building the application
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy project files
COPY . .

# Set API URL environment variable for the frontend
ENV VITE_API_URL=http://gateway:3000/api

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Set production environment
ENV NODE_ENV=production

# Copy built files from the build stage to Nginx serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Configure Nginx
RUN echo \
'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Nginx
EXPOSE 80

# Start the application
CMD ["nginx", "-g", "daemon off;"]
