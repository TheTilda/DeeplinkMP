# Stage 1: Build frontend
FROM node:22-alpine AS builder
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built frontend
COPY --from=builder /app/client/dist ./client/dist

# Persistent data directory — mount a volume here to survive rebuilds
RUN mkdir -p /app/data
VOLUME ["/app/data"]
ENV DB_PATH=/app/data/deeplinker.db

EXPOSE 3001
CMD ["node", "--experimental-sqlite", "server/index.js"]
