# syntax=docker/dockerfile:1
# Static output and the locked serve dependency closure are architecture independent.
FROM --platform=$BUILDPLATFORM ghcr.io/voidzero-dev/vite-plus:1.4.0 AS builder
USER root
RUN mkdir -p /workspace && chown vp:vp /workspace
USER vp
WORKDIR /workspace
COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY --chown=vp:vp apps/landing/package.json ./apps/landing/
COPY --chown=vp:vp apps/website/package.json ./apps/website/
COPY --chown=vp:vp apps/update-worker/package.json ./apps/update-worker/
COPY --chown=vp:vp packages/web-ui/package.json ./packages/web-ui/
COPY --chown=vp:vp packages/shared-contracts/package.json ./packages/shared-contracts/
RUN vp install --filter @opentickly/landing... --frozen-lockfile --ignore-scripts
COPY --chown=vp:vp apps/landing ./apps/landing
COPY --chown=vp:vp packages ./packages
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN vp run @opentickly/landing#build
ARG SOURCE_SHA
# Copy only serve and its runtime dependencies, preserving dependency resolution.
# Hoist a version once; conflicting versions remain local to their consumer.
RUN vp exec node --input-type=module <<'JS'
import fs from 'node:fs';
import path from 'node:path';
const root = '/workspace/release';
const modules = path.join(root, 'node_modules');
const origins = new Map();
function locate(name, from) {
  for (let dir = from; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
    if (dir === path.dirname(dir)) throw new Error(`Missing runtime dependency: ${name}`);
  }
}
function copy(name, source, consumer) {
  const shared = path.join(modules, name);
  let target = shared;
  for (let dir = consumer; dir.startsWith(root); dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name);
    if (origins.has(candidate)) {
      if (origins.get(candidate) === source) return;
      target = path.join(consumer, 'node_modules', name);
      break;
    }
    if (dir === root) break;
  }
  if (origins.has(target) && origins.get(target) !== source) throw new Error('Dependency collision');
  origins.set(target, source);
  fs.cpSync(source, target, { recursive: true, dereference: true,
    filter: file => file === source || !path.relative(source, file).split(path.sep).includes('node_modules') });
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  for (const dependency of Object.keys(pkg.dependencies ?? {}).sort()) {
    copy(dependency, locate(dependency, source), target);
  }
}
copy('serve', locate('serve', '/workspace/apps/landing'), root);
fs.cpSync('/workspace/apps/landing/dist', path.join(root, 'dist'), { recursive: true, dereference: true });
if (!/^[0-9a-f]{40}$/.test(process.env.SOURCE_SHA ?? '')) throw new Error('SOURCE_SHA must be a full SHA');
const configPath = path.join(root, 'dist/serve.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.headers.push({ source: '**', headers: [{ key: 'X-Release-Revision', value: process.env.SOURCE_SHA }] });
fs.writeFileSync(configPath, JSON.stringify(config) + '\n');
JS

FROM scratch AS release
COPY --from=builder /workspace/release/ /app/

# Optional self-hosted runtime; CI exports the release target, not this image.
FROM node:26.13.0-bookworm-slim@sha256:067b2d425f1204b5a898ae3d3145f7524c1425a4096a62b0f67dd4344a494440 AS runtime
WORKDIR /app
COPY --from=builder --chown=node:node /workspace/release/ ./
ENV NODE_ENV=production
USER node
EXPOSE 8080
CMD ["node", "/app/node_modules/serve/build/main.js", "-c", "/app/dist/serve.json", "-l", "8080", "/app/dist"]
