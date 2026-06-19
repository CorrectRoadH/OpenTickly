# Branding & Naming Convention — `opentoggl` vs `OpenTickly`

This project was renamed from **OpenToggl** (old brand) to **OpenTickly** (new brand).
The rename is **deliberately partial**: the public brand moved to OpenTickly, but a set of
internal and stateful identifiers were kept on `opentoggl` on purpose. This document is the
source of truth for deciding which spelling a given field, file, URL, or value should use.

Use it whenever you add or review anything that carries the product name (templates, env
vars, image refs, docs, UI copy, DB/connection strings, asset filenames).

---

## TL;DR — the one rule

> **Public/brand surface → `OpenTickly`. Internal + stateful + backward‑compat‑sensitive
> identifiers → `opentoggl`. The domain `opentoggl.com` is kept.**

If renaming a value would **break an existing self‑hoster's deployment** (orphan a volume,
log out users, reset preferences, 404 a pull/download, break a wire contract), it is a
"keep `opentoggl`" identifier. If a value is only ever **read by a human as the product
name**, it is OpenTickly.

---

## The two names

| Name | What it is | Where it belongs |
| --- | --- | --- |
| **OpenTickly** | The current public product brand. | Everything a user reads as "the product": README/docs prose, landing + app UI copy, PWA/app title, email From‑name & subjects, GitHub repo (`CorrectRoadH/OpenTickly`), OCI image labels, npm scope `@opentickly/*`, the **recommended** Docker image `correctroad/opentickly`, marketing asset filenames (`opentickly-*.webp`). |
| **opentoggl** | The old brand, retained as a stable internal/legacy identifier. | Go module path, `OPENTOGGL_*` env vars, Postgres DB/user/volume names, binary `opentoggl serve`, session cookie, localStorage keys, filestore namespace, telemetry endpoint/UA, the kept domain `opentoggl.com`, the legacy‑compat Docker image `correctroad/opentoggl`, our OpenAPI spec filenames (`openapi/opentoggl-*.openapi.json`) and the `X-OpenToggl-Feature-Gate` header. |

> The split is intentional. A file/system can legitimately mix both — e.g. a Zeabur service
> named `opentickly` (public) that sets `POSTGRES_DB: opentoggl` (stateful) and links to
> `opentoggl.com` (kept domain). That is **correct**, not drift.

---

## Decision rule for any new field

Ask, in order:

1. **Is it user‑visible as the product name?** (title, label, email, marketing, store
   listing, image label) → **OpenTickly**.
2. **Is it a stateful key an existing install already persisted?** (DB name, volume,
   cookie, localStorage key, filestore namespace, PWA `id`, cache name) → **keep
   `opentoggl`** — changing it loses data or resets users.
3. **Is it a wire/CLI/build contract other software depends on?** (env var prefix,
   `X-OpenToggl-*` header, `opentoggl://` scheme, `opentoggl serve` binary, OpenAPI spec
   filenames, Go module path, telemetry endpoint/UA, release asset filename) → **keep
   `opentoggl`** unless migrated in lockstep with every consumer.
4. **Is it the marketing/docs/telemetry domain?** → `opentoggl.com` (kept).
5. **Is it brand‑new with no legacy consumers and user‑visible?** (a fresh template, a new
   public image, new marketing asset) → **OpenTickly**.

---

## Canonical mapping (by role)

Roles: **public‑identity / user‑facing** = OpenTickly · **stateful‑data / legacy‑compat /
internal‑infra** = keep `opentoggl` · **domain** = `opentoggl.com`.

### Keep `opentoggl` (internal · stateful · compat)

| Context | Current value | Why kept |
| --- | --- | --- |
| Go module path | `opentoggl/backend` | Pure internal; touches every import. |
| Env var prefix | `OPENTOGGL_*` (`SERVICE_NAME`, `FILESTORE_NAMESPACE`, `JOBS_QUEUE_NAME`, `TELEMETRY`, `WEBHOOK_ALLOW_PRIVATE_TARGETS`, `AUDIT_LOG_RETENTION_DAYS`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `PORT`, `VERSION`) | Baked into self‑hosters' env/compose/k8s; no fallback. |
| Postgres DB name | `opentoggl` | In every connection string & volume; renaming orphans data. |
| Postgres user (dev) | `opentoggl` | Matches DB name in committed `.env.example`. |
| Compose project / volume | `opentoggl-self-hosted` / `opentoggl-postgres-data` | Renaming creates a fresh empty volume → data loss. |
| Compose backend service | `opentoggl` | Stateful network identifier. |
| Filestore namespace | `opentoggl` | Prefixes stored object keys; renaming orphans uploads. |
| Session cookie | `opentoggl_session` | Renaming logs out every user on upgrade. |
| localStorage keys | `opentoggl:timer-view`, `opentoggl:user-prefs:*`, `opentoggl_onboarding_step` | Renaming resets user prefs / re‑shows onboarding. |
| PWA `id` | `"/"` (no brand string) | Stable install identity; must not be re‑keyed. |
| SW cache names | `api-*` (no brand string) | Browser CacheStorage keys; keep generic. |
| Binary / CLI | `opentoggl serve`, `/usr/local/bin/opentoggl`, `opentoggl-entrypoint`, container user `opentoggl`, air build `opentoggl-backend` | Documented binary contract / internal plumbing. |
| Telemetry endpoint + UA | `https://update.opentoggl.com/`, `opentoggl-backend/telemetry` | Shipped clients poll this; wire contract. |
| Service name default | `opentoggl-api` | Health endpoint + telemetry segmentation; override via `OPENTOGGL_SERVICE_NAME`. |
| Our OpenAPI specs | `openapi/opentoggl-{shared,web,import,admin}.openapi.json` | Build‑time refs; renaming cascades, no user value. |
| Feature‑gate header | `X-OpenToggl-Feature-Gate` | HTTP wire contract; renaming is an API break. |
| Desktop deep link | `opentoggl://desktop-login` | OS‑registered scheme; migrate only with the desktop client. |
| Update‑worker (Cloudflare) | service `opentoggl-update-worker`, dataset `opentoggl_update_requests`, UA `opentoggl-update-worker` | Deployed identity + analytics dataset (stateful). |
| Test schema / fixtures | `opentoggl_test*`, test DSNs | Mirror canonical DB name; ephemeral. |
| Root npm package | `opentoggl` (private) | Never published; internal monorepo name. |
| Harness project | `harness.toml name = "opentoggl"` | Internal task‑runner id. |

### Kept domain

| Context | Current value |
| --- | --- |
| Docs / marketing site | `https://opentoggl.com` |
| Hosted demo | `https://track.opentoggl.com` |
| Update channel | `https://update.opentoggl.com` |

(SEO `siteName` is `OpenTickly` while `siteUrl`/`demoUrl` stay on `opentoggl.com` — correct.)

### Use `OpenTickly` (public · user‑facing)

| Context | Current value |
| --- | --- |
| Product display name | `OpenTickly` (README, DESIGN.md, docs prose, all locales) |
| GitHub repo | `CorrectRoadH/OpenTickly` (also admin version‑check `githubRepo`) |
| npm workspace scope | `@opentickly/{web-ui,website,landing,shared-contracts,update-worker}` |
| Recommended Docker image | `correctroad/opentickly` (dual‑published with legacy `correctroad/opentoggl`) |
| Landing image (GHCR) | `correctroadh/opentickly-landing` |
| OCI image labels | `title="OpenTickly"`, `source=…/OpenTickly` |
| PWA / app title | `OpenTickly` (`vite.config.ts`, `index.html`, `AppShell` tab title, `aria-label`) |
| Public auth/app logo | `PublicMainPanelFrame.tsx` → `OpenTickly` |
| Email identity | From‑name default `OpenTickly`; subjects "Reset your OpenTickly password", etc. |
| Marketing assets | `apps/landing/public/hero/opentickly-*.{png,webp}`, alt text "OpenTickly …" |
| Landing chrome / SEO | footer, 404, `siteName`, JSON‑LD, UTM `opentickly_landing` |
| Source‑build marker | `"OpenTickly Source Build Without Website Assets"` |

> **Icon:** there is **one** canonical icon — `apps/website/public/favicon.svg` (orange
> `#e05d26` rounded square + white `t`). Reference it by raw URL
> (`…/CorrectRoadH/OpenTickly/main/apps/website/public/favicon.svg`, as `zeabur-template.yaml`
> already does). Do **not** create parallel copies of the icon.

---

## PR #26 — Unraid Community Apps template: field classification

PR: [feat: add Unraid Community Apps template](https://github.com/CorrectRoadH/OpenTickly/pull/26).
Files: `templates/opentickly.xml`, `ca_profile.xml`, `icon.svg`, `README.md` section.

### ✅ Correct (public identity → OpenTickly)

| Field | Value | Note |
| --- | --- | --- |
| `<Name>` | `OpenTickly` | CA store display name. |
| `<Repository>` | `correctroad/opentickly:latest` | The recommended go‑forward image (dual‑published). |
| `<Registry>` | `hub.docker.com/r/correctroad/opentickly` | Matches the new image. |
| `<Support>` / `<Project>` / `<ReadMe>` / `<TemplateURL>` | `…/CorrectRoadH/OpenTickly/…` | Correct repo. |
| `<Overview>` / `<Description>` | "OpenTickly is …" | User‑facing copy ("Toggl Track" = competitor, fine). |
| Template filename | `templates/opentickly.xml` | New artifact, no legacy consumers → new brand. |
| `ca_profile.xml` Profile / WebPage / Forum | OpenTickly + repo URLs | Correct. |
| `README.md` Unraid section | OpenTickly prose | Correct (inherits the fixes below). |
| `<Config REDIS_URL>` example | `redis://…` | No brand token. |

### ❌ Wrong — fix before merge

| Field | Current | Should be | Why |
| --- | --- | --- | --- |
| `<Config DATABASE_URL>` example | `postgres://postgres:password@host:5432/`**`opentickly`**`?sslmode=disable` | `…/`**`opentoggl`**`?sslmode=disable` | DB name is a **stateful identifier**; canonical name is `opentoggl` (`docker-compose.yml:7,57`, `.env.example:14`, `zeabur-template.yaml:91`). The example must match every other shipped datasource. |
| `<Requires>` text | "Create the **opentickly** PostgreSQL database…" | "Create the **opentoggl** PostgreSQL database…" | Same reason — instructs users to create a divergent DB name. |
| `<Icon>` (template) and `Icon` (`ca_profile.xml`) | `…/OpenTickly/main/`**`icon.svg`** | `…/OpenTickly/main/`**`apps/website/public/favicon.svg`** | The repo path is fine, but it points at a **newly hand‑rolled** `icon.svg`. |
| New file `icon.svg` | Orange `#e05d26` square + white `t` | **Delete it; reuse the existing `favicon.svg`** | It is **byte‑for‑byte identical** to `apps/website/public/favicon.svg`. Adding it is a second source of truth — violates "one canonical X" / "reuse before creating". A future logo change would silently desync the two. |

**Summary for PR #26:** the brand‑identity fields are right; the only errors are (1) the
**DB name** wrongly rebranded to `opentickly` in two places — must be `opentoggl`, and (2) a
**duplicate icon** — point both `<Icon>` fields at `apps/website/public/favicon.svg` and drop
the new `icon.svg`.

---

## Known drift / follow‑ups (found during the naming audit)

These are pre‑existing inconsistencies, independent of PR #26, recorded here so the rule above
has teeth. None are required to merge PR #26.

1. ~~**App header wordmark still says `opentoggl`.**~~ **Fixed** — `apps/website/src/app/AppShell.tsx:154`
   now renders `OpenTickly`, matching the tab title, `aria-label`, and `PublicMainPanelFrame.tsx:40`.
2. ~~**Email From‑name column default is still `OpenToggl`.**~~ **Fixed** — migration
   `00014_rebrand_email_sender_name.sql` moves the `instance_admin_config.sender_name` default to
   `'OpenTickly'` and updates the singleton row only where it still held the old default (admin
   customizations untouched); `latest.sql` updated to match. The immutable `00001_baseline.sql`
   was left as‑is. Verified by `TestLatestSQLMatchesMigrations`.
3. ~~**Zeabur `coverImage` is a 404.**~~ **Fixed** — `zeabur-template.yaml` now points at
   `hero/opentickly-calendar-view.webp` (the renamed asset).
4. ~~**Zeabur GHCR upgrade link** was broken.~~ **Fixed** — the backend image is published to
   **Docker Hub only** (not GHCR), so the six `pkgs/container/opentoggl` links now point at
   `https://hub.docker.com/r/correctroad/opentickly/tags`.
5. ~~**`docker-compose.yml` / `zeabur-template.yaml` still pulled `correctroad/opentoggl`.**~~
   **Fixed** — both now pull `correctroad/opentickly` (`:latest` / `:0.2`), the recommended
   go‑forward image (identical dual‑published tags, so existing data volumes are unaffected).
6. ~~**`changelog.mdx` pointed users at the old `correctroad/opentoggl` Docker Hub repo.**~~
   **Fixed** — updated to `correctroad/opentickly` across all 8 locales.
7. ~~**Rebrand note coverage was uneven.**~~ **Fixed** — "OpenTickly was previously named
   OpenToggl" now appears in all locale `index.mdx` (added to `ko/es/ja/fr/pl/pt`).
8. ~~**Duplicate `sessionCookieName` constant.**~~ **Fixed** — the literal `"opentoggl_session"`
   now lives in exactly one place, `internal/platform/websession.CookieName` (a const‑only leaf
   package, so no import cycle). The two local consts and three inline literals (`bootstrap`,
   `httpapp`, `publicapi`) all reference it. Value stays `opentoggl_session` (renaming it would
   log out every existing session).
