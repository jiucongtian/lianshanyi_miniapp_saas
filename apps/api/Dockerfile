FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# ─── Development stage ───────────────────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["dumb-init", "npx", "tsx", "watch", "src/server.ts"]

# ─── Build stage ─────────────────────────────────────────────────────────────
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Production stage ────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# Copy JS lib files (non-compiled BaZi calculator)
COPY --from=build /app/src/lib/bazi/*.js ./dist/src/lib/bazi/
EXPOSE 3000
CMD ["dumb-init", "node", "dist/src/server.js"]
