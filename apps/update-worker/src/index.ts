import { recordCheckin } from "./analytics.ts";
import { getActiveAnnouncements, getChangelog } from "./content.ts";
import { buildManifest } from "./manifest.ts";
import type { WorkerEnv } from "./types.ts";
import { checkRequestSchema } from "./validation.ts";

const MAX_BODY_BYTES = 2048;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Routing is deliberately dumb — a switch keeps the surface area visible
    // and lets us add endpoints without a router dep.
    switch (`${request.method} ${url.pathname}`) {
      case "POST /v1/check":
        return handleCheck(request, env);
      case "GET /v1/manifest":
        return handleManifest(env);
      case "GET /v1/changelog":
        return json({ entries: getChangelog() });
      case "GET /v1/announcements":
        return json({ announcements: getActiveAnnouncements() });
      case "GET /healthz":
        return new Response("ok", { status: 200, headers: CORS_HEADERS });
      default:
        return json({ error: "not_found" }, 404);
    }
  },
};

async function handleCheck(request: Request, env: WorkerEnv): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = checkRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "invalid_payload", issues: parsed.error.issues }, 400);
  }

  recordCheckin(env, parsed.data, request);

  const manifest = buildManifest({
    latestTag: env.LATEST_TAG,
    clientVersion: parsed.data.version,
  });
  return json(manifest);
}

function handleManifest(env: WorkerEnv): Response {
  const manifest = buildManifest({ latestTag: env.LATEST_TAG });
  return json(manifest, 200, { "Cache-Control": "public, max-age=300" });
}

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
