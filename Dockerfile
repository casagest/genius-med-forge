# Multi-stage build for optimization
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_WS_URL
ARG VITE_APP_VERSION
ARG VITE_ENABLE_ANALYTICS=false

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_ENABLE_ANALYTICS=$VITE_ENABLE_ANALYTICS

# Type check and build application
RUN npm run build

# Stage 3: Production
FROM nginx:1.25-alpine AS production

# Install security updates and required tools
RUN apk update && apk upgrade && \
    apk add --no-cache curl ca-certificates tzdata && \
    rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=UTC

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run/nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Add security headers configuration
RUN echo 'add_header X-Content-Type-Options "nosniff" always;' > /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-Frame-Options "DENY" always;' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-XSS-Protection "1; mode=block" always;' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header Permissions-Policy "geolocation=(), microphone=(self), camera=()" always;' >> /etc/nginx/conf.d/security.conf

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Use non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Add labels for container metadata
LABEL maintainer="GENIUS MedicalCor AI Team"
LABEL version="1.0.0"
LABEL description="GENIUS MedicalCor AI Platform"
LABEL org.opencontainers.image.source="https://github.com/your-org/genius-med-forge"
