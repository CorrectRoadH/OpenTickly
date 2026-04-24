# @opentickly/update-worker

Cloudflare Worker behind [`https://update.opentoggl.com/`](https://update.opentoggl.com/). One GET endpoint. Proxies GitHub Releases + serves baked announcements.

## The endpoint

```
GET https://update.opentoggl.com/
  ?version=0.3.1             # client's current version (optional)
  &instanceId=<uuid>         # stable per-instance id (optional; enables DAU)
  &os=linux                  # optional
  &arch=amd64                # optional
  &goVersion=go1.23.4        # optional
  &locale=en-US              # optional
```

Every param is optional. A bare `curl https://update.opentoggl.com/` returns the manifest without any client context.

### Response

```json
{
  "latestVersion": "0.3.1",
  "latestTag": "v0.3.1",
  "updateAvailable": true,
  "releasedAt": "2026-04-16T12:00:00Z",
  "releaseUrl": "https://github.com/CorrectRoadH/OpenTickly/releases/tag/v0.3.1",
  "releaseNotes": "…markdown body of the latest release…",
  "announcements": [
    {
      "id": "welcome-2026-04",
      "title": "…",
      "severity": "info",
      "publishedAt": "…",
      "expiresAt": "…",
      "link": "…",
      "bodyMarkdown": "…"
    }
  ]
}
```

`updateAvailable` is only `true` when the caller passed `?version=...` and it doesn't match `latestVersion` — callers without a version always see `false`.

Cache: the Worker edge-caches the composed response for 60s; the inner GitHub fetch is cached for 5min across all colos. One origin hit to GitHub every ~5min per colo.

## Publishing a new release

Just **publish a GitHub Release** on [CorrectRoadH/opentoggl](https://github.com/CorrectRoadH/OpenTickly/releases). That's it — the worker picks it up on the next cache miss. No redeploy needed.

## Publishing an announcement

Announcements aren't in GitHub Releases — they're baked into the Worker at deploy time from `content/announcements/*.md`.

1. Add `content/announcements/<slug>.md` with frontmatter:

   ```markdown
   ---
   id: "freeze-2026-05"
   title: "Scheduled maintenance May 3rd"
   severity: "warning" # info | warning | critical
   publishedAt: "2026-05-01"
   expiresAt: "2026-05-04" # optional
   link: "https://status.opentoggl.com/..." # optional
   ---

   …markdown body…
   ```

2. Commit + push to `main`. GitHub Actions (`.github/workflows/update-worker-deploy.yml`) redeploys.
3. Expired announcements are filtered out at request time.

## Env / bindings

- `GITHUB_REPO` — `owner/repo` the Worker proxies releases from. Default `CorrectRoadH/opentoggl`.
- `GITHUB_TOKEN` (optional secret) — only needed if the 60/hr unauthenticated rate limit becomes an issue. `wrangler secret put GITHUB_TOKEN --env production`.
- `UPDATE_REQUESTS` — Analytics Engine dataset binding for DAU. `recordUpdateRequest` is a no-op if the binding is ever removed.

## Analytics (when enabled)

One data point per request with a valid `instanceId` + `version`. Schema (see `src/analytics.ts`):

```
index1 = instance_id
blob1  = version
blob2  = go_version
blob3  = os
blob4  = arch
blob5  = locale
blob6  = country (CF-derived)
```

Example query via the Cloudflare Analytics API:

```sql
SELECT blob1 AS version, COUNT(DISTINCT index1) AS instances
FROM opentoggl_update_requests
WHERE timestamp > NOW() - INTERVAL '1' DAY
GROUP BY version
ORDER BY instances DESC
```

## Deploying

Auto: push to `main` with changes under `apps/update-worker/**` → GHA workflow redeploys.

Manual: `vp run update-worker#deploy` (requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`).

## Layout

```
apps/update-worker/
  src/
    index.ts             single GET handler
    github.ts            releases fetch + CF edge cache
    manifest.ts          combines releases + announcements
    content.ts           reads baked announcements
    content.generated.ts AUTO-GENERATED (do not edit)
    analytics.ts         best-effort AE write
    validation.ts        zod schema for query params
    types.ts             response shape
  content/announcements/ *.md — published at deploy
  scripts/build-content.mjs   bakes announcements → content.generated.ts
  test/                  vitest
  wrangler.toml
```
