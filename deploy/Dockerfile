# Build self-hosted Node server for Yue Lock
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
# Auth must be on in the built client bundle
ENV NITRO_PRESET=node-server
# Ensure Vite sees auth enabled at build time (with-app-env reads .grok/app-env.json)
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
# Nitro node-server output
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules ./node_modules
EXPOSE 8080
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]
