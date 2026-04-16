# @opentoggl/update-worker

Cloudflare Worker that backs `check.opentoggl.com`. Does two jobs:

1. **Ingest** — accepts daily version check-ins from self-hosted backends, writes to Analytics Engine for DAU + version-distribution reporting.
2. **Serve** — returns the current manifest (latest release + active announcements) so backends can surface "update available" / broadcast notices to admins.

Content (changelog entries, announcements) lives as markdown-with-frontmatter under `content/`. A prebuild script (`scripts/build-content.mjs`) bakes it into `src/content.generated.ts` — deploying the worker is the same action as publishing new notes.

## Endpoints

| Method | Path                  | Purpose                                       |
| ------ | --------------------- | --------------------------------------------- |
| POST   | `/v1/check`           | Ingest check-in, return manifest              |
| GET    | `/v1/manifest`        | Return manifest (no side effects, cached 5m)  |
| GET    | `/v1/changelog`       | Full changelog as JSON                        |
| GET    | `/v1/announcements`   | Active announcements (expired filtered out)   |
| GET    | `/healthz`            | Liveness probe                                |

### POST /v1/check payload

```json
{
  "instanceId": "8b9a2f0e-1c4d-4b5a-9f8e-9d2a7c3b1a2e",
  "version": "0.3.1",
  "goVersion": "go1.23.4",
  "os": "linux",
  "arch": "amd64",
  "locale": "en-US"
}
```

Only `instanceId` and `version` are required. See `src/validation.ts` for the exact schema.

### Response

```json
{
  "latestVersion": "0.3.1",
  "latestTag": "0.3.1",
  "updateAvailable": false,
  "releasedAt": "2026-04-16",
  "changelogUrl": "https://github.com/CorrectRoadH/opentoggl/blob/main/CHANGELOG.md",
  "announcements": [
    {
      "id": "welcome-2026-04",
      "title": "Welcome to OpenToggl",
      "severity": "info",
      "publishedAt": "2026-04-16",
      "expiresAt": "2026-07-16",
      "link": "https://github.com/CorrectRoadH/opentoggl",
      "bodyMarkdown": "..."
    }
  ]
}
```

## Publishing a new release

1. Add `content/changelog/<version>.md` with `tag`, `date`, `title` frontmatter.
2. (Optional) Add `content/announcements/<slug>.md` with `id`, `title`, `severity`, `publishedAt`, optional `expiresAt` / `link`.
3. `vp run update-worker#deploy`

The newest changelog entry (by `date`) becomes `latestVersion` automatically when `LATEST_TAG=latest` (the default). Pin to a specific tag by overriding `LATEST_TAG` in `wrangler.toml`.

## Analytics

See `src/analytics.ts` for the Analytics Engine schema. Query via the Cloudflare Analytics API:

```sql
SELECT blob1 AS version, COUNT(DISTINCT index1) AS instances
FROM opentoggl_checkins
WHERE timestamp > NOW() - INTERVAL '1' DAY
GROUP BY version
ORDER BY instances DESC
```
