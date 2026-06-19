# Build from the repository root:  docker build -f apps/miniapp/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/miniapp/package.json apps/miniapp/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/miniapp apps/miniapp
RUN npm run build --workspace packages/shared \
  && npm run build --workspace apps/miniapp

# ---

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/miniapp/dist /usr/share/nginx/html
COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
