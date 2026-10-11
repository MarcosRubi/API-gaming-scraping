# --- build: compila TypeScript a dist/ ---
FROM node:22-bookworm-slim AS build

ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# --- runtime: solo dist/ + dependencias de producción ---
FROM node:22-bookworm-slim

# Chromium del sistema (en vez del Chromium embebido de puppeteer): en un VPS
# de larga duración lo parchea apt en cada rebuild, no una versión de npm fija.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
