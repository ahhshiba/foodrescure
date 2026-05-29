# Multi-stage: build both frontends, then serve them with nginx.
# Build context is the repo root (see docker-compose.yml).

FROM node:20-alpine AS build
WORKDIR /build
COPY web ./web
RUN cd web && npm ci \
    && npm run build:contracts \
    && npm run build --workspace @glitch/game \
    && npm run build --workspace @glitch/dashboard

FROM nginx:1.27-alpine
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /build/web/apps/game/dist /usr/share/nginx/html
COPY --from=build /build/web/apps/dashboard/dist /usr/share/nginx/html/dashboard
