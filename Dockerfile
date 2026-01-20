# Multi-stage build for production

# Stage 1: Build client
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Stage 2: Setup server
FROM node:18-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Install production dependencies
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server ./server

# Copy client build
COPY --from=client-builder /app/client/dist ./client/dist

# Create uploads directory
RUN mkdir -p /app/server/uploads/products
RUN mkdir -p /app/server/temp

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 5050

# Start server
WORKDIR /app/server
CMD ["node", "src/index.js"]
