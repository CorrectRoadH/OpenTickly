import { recordUpdateRequest } from "./analytics.ts";
import { getActiveAnnouncements } from "./content.ts";
import { fetchReleases, type GithubRelease } from "./github.ts";
import { buildManifest } from "./manifest.ts";
import type { WorkerEnv } from "./types.ts";
import { parseQueryParams } from "./validation.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "GET") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/") {
      return json({ error: "not_found" }, 404);
    }

    const query = parseQueryParams(url.searchParams);

    // If GitHub is unreachable we degrade to empty releases but keep serving
    // announcements. Clients interpret `latestVersion === ""` as "unknown".
    let releases: GithubRelease[] = [];
    try {
      releases = await fetchReleases(env.GITHUB_REPO, env.GITHUB_TOKEN);
    } catch (err) {
      console.error("[update-worker] github fetch failed", err);
    }

    const manifest = buildManifest({
      releases,
      announcements: getActiveAnnouncements(),
      clientVersion: query.version,
    });

    // Best-effort DAU write — never blocks the response.
    ctx.waitUntil(Promise.resolve().then(() => recordUpdateRequest(env, query, request)));

    return json(manifest, 200, {
      // Edge-cache the composed manifest for a minute so a stampede doesn't
      // translate 1:1 into GH fetches. GH itself is cached for 5min in github.ts.
      "Cache-Control": "public, max-age=60",
    });
  },
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extra,
    },
  });
}
