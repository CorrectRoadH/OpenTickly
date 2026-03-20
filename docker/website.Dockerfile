FROM node:22.12.0-bookworm-slim AS builder

WORKDIR /workspace

RUN npm install -g pnpm@10.32.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --ignore-scripts
RUN pnpm --filter @opentoggl/website exec vite build --outDir /out

FROM nginx:1.27-alpine

COPY docker/nginx/website.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /out /usr/share/nginx/html

EXPOSE 80
