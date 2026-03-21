#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..", "..");
const composePath = resolve(rootDir, "docker-compose.yml");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
  });
  if (result.error) {
    fail(`failed to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureContains(content, needle, fileLabel) {
  if (!content.includes(needle)) {
    throw new Error(`expected "${needle}" in ${fileLabel}`);
  }
}

function ensureFile(path, currentRootDir = rootDir) {
  if (!existsSync(path)) {
    throw new Error(`missing required file: ${path.replace(`${currentRootDir}/`, "")}`);
  }
}

function readFileFromRoot(currentRootDir, relativePath) {
  const path = resolve(currentRootDir, relativePath);
  ensureFile(path, currentRootDir);
  return readFileSync(path, "utf8");
}

export function readCompose(currentRootDir = rootDir) {
  return readFileFromRoot(currentRootDir, "docker-compose.yml");
}

export function detectComposeShape(compose) {
  const hasTarget = compose.includes("opentoggl:");
  const hasTransitional = compose.includes("api:") && compose.includes("website:");
  if (hasTarget) {
    return "target";
  }
  if (hasTransitional) {
    return "transitional";
  }
  return "unknown";
}

function verifyTargetPackagingChain(compose, currentRootDir) {
  ensureContains(compose, "docker/opentoggl.Dockerfile", "docker-compose.yml");

  const dockerfileLabel = "docker/opentoggl.Dockerfile";
  const dockerfile = readFileFromRoot(currentRootDir, dockerfileLabel);
  ensureContains(dockerfile, "pnpm --filter @opentoggl/website run build", dockerfileLabel);
  ensureContains(
    dockerfile,
    "COPY --from=website-builder /workspace/apps/website/dist ./apps/backend/internal/web/dist",
    dockerfileLabel,
  );

  ensureFile(resolve(currentRootDir, "apps/backend/internal/web/dist/index.html"), currentRootDir);
}

export function verifyArtifactsAtRoot(currentRootDir = rootDir) {
  const compose = readCompose(currentRootDir);
  ensureContains(compose, "services:", "docker-compose.yml");
  ensureContains(compose, "postgres:", "docker-compose.yml");
  ensureContains(compose, "redis:", "docker-compose.yml");
  ensureContains(compose, "/readyz", "docker-compose.yml");

  const shape = detectComposeShape(compose);
  if (shape === "target") {
    ensureContains(compose, "opentoggl:", "docker-compose.yml");
    verifyTargetPackagingChain(compose, currentRootDir);
	} else if (shape === "transitional") {
		ensureContains(compose, "api:", "docker-compose.yml");
		ensureContains(compose, "website:", "docker-compose.yml");
		ensureContains(compose, "docker/website.Dockerfile", "docker-compose.yml");
		console.warn(
			"[self-hosted verify] drift: compose is still transitional (api + website). Target shape is single runtime service 'opentoggl'.",
    );
  } else {
    throw new Error(
      "could not determine compose service shape; expected 'opentoggl' or transitional 'api + website'",
    );
  }

  const backendServer = readFileFromRoot(currentRootDir, "apps/backend/internal/http/server.go");
  ensureContains(backendServer, '"/healthz"', "apps/backend/internal/http/server.go");
  ensureContains(backendServer, '"/readyz"', "apps/backend/internal/http/server.go");

  return shape;
}

async function waitForHttp(url, retries) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const result = spawnSync("curl", ["-fsS", url], { stdio: "ignore" });
    if (result.status === 0) {
      return;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  fail(`timed out waiting for ${url}`);
}

async function smokeChecks(shape) {
  const apiBase = process.env.OPENTOGGL_API_URL ?? "http://localhost:8080";
  const webBase = process.env.OPENTOGGL_WEB_URL ?? "http://localhost:3000";
  const retries = Number.parseInt(process.env.SMOKE_MAX_RETRIES ?? "30", 10);
  if (Number.isNaN(retries) || retries < 1) {
    fail("SMOKE_MAX_RETRIES must be a positive integer");
  }

  await waitForHttp(`${apiBase}/readyz`, retries);
  run("curl", ["-fsS", `${apiBase}/healthz`]);
  run("curl", ["-fsS", `${apiBase}/readyz`]);
  if (shape === "transitional") {
    await waitForHttp(`${webBase}/readyz`, retries);
    run("curl", ["-fsSI", `${webBase}/`]);
    run("curl", ["-fsS", `${webBase}/healthz`]);
    run("curl", ["-fsS", `${webBase}/readyz`]);
  } else {
    run("curl", ["-fsSI", `${apiBase}/`]);
  }
  console.log("self-hosted smoke checks passed");
}

async function main() {
  const subcommand = process.argv[2];
  if (!subcommand) {
    fail("usage: node tools/self-hosted/cli.mjs <verify|smoke|up>");
  }

  switch (subcommand) {
    case "verify":
      verifyArtifactsAtRoot();
      console.log("self-hosted artifacts verification passed");
      return;
    case "smoke":
      await smokeChecks(detectComposeShape(readCompose()));
      return;
    case "up":
      {
        const shape = verifyArtifactsAtRoot();
        console.log("self-hosted artifacts verification passed");
        run("docker", ["compose", "up", "-d", "--build"]);
        run("docker", ["compose", "ps"]);
        await smokeChecks(shape);
      }
      return;
    default:
      fail(`unknown subcommand: ${subcommand}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}
