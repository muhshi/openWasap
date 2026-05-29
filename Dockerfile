# OpenWA - Dockerfile (optimized)
# Multi-stage build for production-ready image

# ===== Stage 1: Builder =====
# Use slim image; build tools only needed here
FROM node:22-slim AS builder

WORKDIR /app

# Install build tools required by native modules (e.g. sqlite3, whatsapp-web.js)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy ONLY lock + manifest — layer cached until these files change
COPY package.json package-lock.json ./

# Skip the `postinstall` script (it would try to install the dashboard too)
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build


# ===== Stage 2: Production dependencies =====
# Separate stage so prod-dep layer is cached independently of source changes
FROM node:22-slim AS deps

WORKDIR /app

# Same build tools needed for native production modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Install production deps only — heavily cached because package.json rarely changes
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force


# ===== Stage 3: Production runtime =====
FROM node:22-slim AS production

# Install Chromium + runtime libraries in one layer.
# This layer is HUGE (~500 MB) but cached unless the base image changes.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

# Create app user for security
RUN groupadd -r openwa && useradd -r -g openwa openwa

WORKDIR /app

# Pull prod node_modules from dedicated deps stage (cached)
COPY --from=deps /app/node_modules ./node_modules

# Pull compiled application from builder stage
COPY --from=builder /app/dist ./dist

# Create data directories and set ownership ONLY on data dir, not the whole /app
RUN mkdir -p /app/data/sessions /app/data/media /app/data/plugins \
    && chown -R openwa:openwa /app/data

EXPOSE 2785

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:2785/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
