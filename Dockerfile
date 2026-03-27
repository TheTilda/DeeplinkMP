# ---- Stage 1: Build frontend ----
FROM node:22-alpine AS builder

WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ---- Stage 2: Production server ----
FROM node:22-alpine AS runner

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./

# Copy built frontend from stage 1
COPY --from=builder /build/client/dist ./client/dist

# Data directory for SQLite DB (mount as volume)
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/deeplinker.db

EXPOSE 3001

CMD ["node", "--experimental-sqlite", "index.js"]
