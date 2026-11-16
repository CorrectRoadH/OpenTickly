import { readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { sentryVitePlugin } from "@sentry/vite-plugin";

function removeMaps(directory: string) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) removeMaps(path);
    else if (entry.isFile() && entry.name.endsWith(".map")) rmSync(path);
  }
}
function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}
export function sentryBuild(
  component: "web" | "landing" | "update",
  project: string,
  outDir: string,
) {
  const sha = process.env.SOURCE_SHA || process.env.GITHUB_SHA || gitSha();
  if (sha && !/^[a-f0-9]{40}$/.test(sha))
    throw new Error("Sentry build requires a full source SHA");
  const release = sha ? `${component}@${sha}` : "";
  return {
    release,
    plugins: [
      ...(component === "web"
        ? [
            {
              name: "sentry-build-identity",
              generateBundle() {
                this.emitFile({
                  type: "asset" as const,
                  fileName: "sentry-release.json",
                  source: JSON.stringify({ release }),
                });
              },
            } satisfies import("vite").Plugin,
          ]
        : []),
      {
        name: "private-source-maps",
        closeBundle: {
          order: "post" as const,
          sequential: true,
          handler() {
            removeMaps(outDir);
          },
        },
      },
      sentryVitePlugin({
        org: "instaai",
        project,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: release, create: Boolean(process.env.SENTRY_AUTH_TOKEN) },
        sourcemaps: {
          disable: !process.env.SENTRY_AUTH_TOKEN,
          filesToDeleteAfterUpload: [`${outDir}/**/*.map`],
        },
        telemetry: false,
      }),
    ],
  };
}
