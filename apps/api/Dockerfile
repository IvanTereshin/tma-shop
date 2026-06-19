# Build from the repository root:  docker build -f apps/api/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app

# Install dependencies using the lockfile and only the manifests we need.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci

# Build the shared package, then the API.
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace packages/shared \
  && npm run build --workspace apps/api

# ---

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy installed modules (incl. the workspace symlink) and build artifacts.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle

WORKDIR /app/apps/api
EXPOSE 3000

# Apply migrations, then start the server.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
