# =============================================================================
# Dockerfile — IoT Gateway (Modul B)
# Multi-Protocol Ingestion: HTTP + MQTT + CoAP
# =============================================================================

FROM node:20-alpine

LABEL maintainer="TIP Modul B Team"
LABEL description="IoT Protocol Gateway — HTTP, MQTT, CoAP Ingestion"

WORKDIR /app

# Copy package files dan install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production && npm cache clean --force

# Copy seluruh source code gateway
COPY . .

# Expose ports untuk ketiga protokol
EXPOSE 3000
EXPOSE 1884
EXPOSE 5683/udp

# Health check via HTTP endpoint
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Jalankan gateway
CMD ["node", "index.js"]
