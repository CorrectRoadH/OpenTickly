import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { verifyArtifactsAtRoot } from "./cli.mjs";

function createFixtureRoot() {
  const rootDir = mkdtempSync(join(tmpdir(), "self-hosted-cli-"));

  mkdirSync(join(rootDir, "docker"), { recursive: true });
  mkdirSync(join(rootDir, "apps/backend/internal/http"), { recursive: true });
  mkdirSync(join(rootDir, "apps/backend/internal/web/dist"), { recursive: true });

  writeFileSync(
    join(rootDir, "docker-compose.yml"),
    [
      "services:",
      "  postgres:",
      "    image: postgres:16-alpine",
      "  redis:",
      "    image: redis:7-alpine",
      "  opentoggl:",
      "    build:",
      "      context: .",
      "      dockerfile: docker/opentoggl.Dockerfile",
      "    healthcheck:",
      '      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/readyz"]',
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(rootDir, "docker/opentoggl.Dockerfile"),
    [
      "FROM node:22 AS website-builder",
      "RUN pnpm --filter @opentoggl/website run build",
      "FROM golang:1.25-alpine AS builder",
      "COPY --from=website-builder /workspace/apps/website/dist ./apps/backend/internal/web/dist",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(rootDir, "apps/backend/internal/http/server.go"),
    ['server.GET("/healthz", healthHandler)', 'server.GET("/readyz", healthHandler)', ""].join("\n"),
  );
  writeFileSync(join(rootDir, "apps/backend/internal/web/dist/index.html"), "<!doctype html>\n");

  return rootDir;
}

describe("verifyArtifactsAtRoot", () => {
  const createdRoots: string[] = [];

  afterEach(() => {
    while (createdRoots.length > 0) {
      const rootDir = createdRoots.pop();
      if (rootDir) {
        rmSync(rootDir, { recursive: true, force: true });
      }
    }
  });

  it("accepts the target single-runtime packaging chain", () => {
    const rootDir = createFixtureRoot();
    createdRoots.push(rootDir);

    expect(verifyArtifactsAtRoot(rootDir)).toBe("target");
  });

  it("fails when the Dockerfile stops building the website dist", () => {
    const rootDir = createFixtureRoot();
    createdRoots.push(rootDir);

    writeFileSync(join(rootDir, "docker/opentoggl.Dockerfile"), "FROM golang:1.25-alpine\n");

    expect(() => verifyArtifactsAtRoot(rootDir)).toThrow(
      'expected "pnpm --filter @opentoggl/website run build" in docker/opentoggl.Dockerfile',
    );
  });

  it("fails when the fallback embedded dist asset is missing", () => {
    const rootDir = createFixtureRoot();
    createdRoots.push(rootDir);

    rmSync(join(rootDir, "apps/backend/internal/web/dist/index.html"));

    expect(() => verifyArtifactsAtRoot(rootDir)).toThrow(
      "missing required file: apps/backend/internal/web/dist/index.html",
    );
  });
});
