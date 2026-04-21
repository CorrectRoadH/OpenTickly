**Requirements**: [GOALS.md](GOALS.md)
**Limits**: [LIMITS.md](LIMITS.md)
**Decision**: [DECISION.md](DECISION.md) (current main path is [PLAN-4](PLAN-4.md); this document is the full-version reference)

---

## Implementation plan 1 (recommended)

### Summary

Keep Ahrefs Web Analytics as the pageview foundation for both landing / demo, **add a 1st-party `/go/:target` click redirect Worker** covering all outbound links (GitHub first), **extend update-worker to accept an `install_source` parameter** to persist the source tag for self-deployed instances, use **Google Search Console + Bing Webmaster + Ahrefs MCP** for a weekly SEO report, and use **Ahrefs Brand Radar** as the primary GEO data source, paired with a fixed prompt library covering the four major platforms ChatGPT / Gemini / Perplexity / Claude. What remains unresolved is the long-chain attribution from "AI answer citation with no referer → actual install", which needs an in-product first-run self-reported-source survey to complement.

---

## Entity understanding summary

- **Entity**: OpenToggl (open-source self-hostable Toggl Track alternative)
- **Surfaces**: landing `opentoggl.com` (SSR, multilingual en/zh/es/ja/fr/ko/pl/pt), demo `track.opentoggl.com` (SPA, noindex), GitHub `github.com/CorrectRoadH/opentoggl`, future docs
- **Business type**: **PLG/SaaS + open source distribution hybrid**. Core conversions are not paid but: ① GitHub Star; ② trying demo; ③ `docker run` / binary self-hosted install; ④ deep doc read; ⑤ contribution
- **Market**: **Overseas GEO primary**. English default, 8 locales, targeting global open-source developers. Domestic GEO is opportunistic; no dedicated patch effort for now

---

## Market-split judgment

Per `references/market-split-framework.md`:

- **Overseas GEO main path** (ChatGPT / Gemini / Perplexity / Claude): site page matrix, form fields, page events, signup/install round-trip are the main skeleton. This path carries 80%+ of expected value
- **Domestic GEO auxiliary** (DeepSeek / Doubao / Yuanbao / Kimi): **no** dedicated WeCom / phone / password. Only Brand Radar monitoring + Chinese landing exposure observation; add more once clear signal appears
- **Unified ingestion**: all attribution is written to the same `inbound_traffic` event table; `ai_platform` field is a platform enum to allow later domestic/overseas split

---

## Public evidence table

| source_locator | absolute_time | fact_or_inference | how_used |
|---|---|---|---|
| `apps/landing/app/root.tsx:50-54` | 2026-04-18 | Ahrefs Web Analytics integrated on landing | Reused as pageview foundation |
| `apps/landing/app/routes/home.tsx:38-56` | 2026-04-18 | GitHub / demo outbound links already carry UTM | Keep UTM, add server-side redirector |
| `apps/website/index.html:6` | 2026-04-18 | Demo is `noindex, nofollow` SPA, no analytics | Add Ahrefs or 1st-party reporting |
| `apps/update-worker/src/analytics.ts:20-41` | 2026-04-18 | Already records instance version/country via CF Analytics Engine | Extend `install_source` blob |
| Project MEMORY.md | 2026-04-18 | Using Zustand + React Query; React Compiler forbids hand-written memo | Reporting helpers skip unnecessary memo |

---

## Official verification

- **Official domains**: `opentoggl.com` (landing), `track.opentoggl.com` (demo)
- **Verification basis**: `resolveSiteUrl()` in `apps/landing/app/lib/seo.ts` uses `opentoggl.com`; `apps/website/index.html` canonical points to `track.opentoggl.com/`
- **GitHub**: `github.com/CorrectRoadH/opentoggl` (git remote consistent)

---

## Current diagnosis

### Existing assets

- Ahrefs Web Analytics (landing pageview / referrer / country)
- Ahrefs subscription includes Brand Radar / GSC / Keywords Explorer / Site Explorer
- Landing UTM helper `appendUtm`
- Update-worker already counts self-deployed instance country × version

### Clear gaps

- GitHub outbound clicks **have no slot-level attribution** (UTM is useless on GitHub)
- Demo site **has no analytics at all**; landing→demo conversion is unmeasurable
- No weekly report mechanism for GSC / Bing Webmaster
- No GEO prompt monitoring; Brand Radar not enabled
- "Source" field for `docker run` installs is missing

### Effectiveness tracking methods and principles

| Tier | Method | Monitoring principle | Applicable scenarios | Action |
|---|---|---|---|---|
| **Brand tier** | Mention count in AI answers | Being recommended / compared / cited by AI constitutes 3rd-party endorsement | ChatGPT / Perplexity / Gemini / Claude | Brand Radar fixed prompt library + weekly snapshot |
| **Direct tier** | `/go/:target` redirector | Log before server-side 302; slot-level ref tag is preserved | All outbound GitHub / demo / X links | Cloudflare Worker logs to D1 / Analytics Engine |
| **Direct tier** | Cross-domain visitor stitching | First landing hop writes `ot_v` param, passed to demo | landing→demo conversion | Demo entry reads `ot_v`, writes first event |
| **Direct tier** | `install_source` round-trip | Install script carries source tag, update-worker persists on first heartbeat | Self-hosted install | Extend `/api/update` query |
| **Indirect tier** | Brand-term search volume | Users actively search "opentoggl" after AI exposure | GSC brand-term bundle | Fixed queries `opentoggl / open toggl / 开源 toggl` |
| **Indirect tier** | Demo first-visit survey | Self-report source when referer is missing | AI answer citation without link | Add "How did you hear?" as step 1 of demo onboarding |
| **Indirect tier** | GitHub Star growth rate | Lagging signal of AI exposure | All AI platforms | GH API daily pull of stargazers_count |

---

## Direct effect tracking plan

### D1. `/go/:target` 1st-party click redirector

**Goal**: resolve the core gap "GitHub outbound links have no slot-level attribution".

**Design**:

- New Cloudflare Worker or Zeabur service: `opentoggl.com/go/:target?ref=<slot>&locale=<xx>`
- `target` comes from a controlled allowlist: `github / github-issues / github-discussions / demo / x / status / hn` (allowlist stored in repo file `config/outbound-targets.json`, reviewable in PR)
- Logic: parse → log (Analytics Engine `OUTBOUND_CLICKS` binding) → 302 to real URL
- **Fail-open**: if binding is missing or logging throws, still 302
- Landing's `appendUtm` is replaced by `buildGoUrl({ target, slot, locale })`; UTM is no longer attached to the real URL (URL becomes clean)
- Slot naming convention: `hero_cta / proof_card / footer / faq / docs_inline / readme_cta`

**Analytics Engine schema**:

```text
index1 = target                 # github, demo, ...
blob1  = slot                   # hero_cta, ...
blob2  = locale                 # en, zh, ...
blob3  = referer                # originating page, for 2D cross-tab
blob4  = country                # CF-derived
blob5  = ua_family              # desktop / mobile / bot
blob6  = visitor_id             # 1st-party cookie `ot_v`, 1-year TTL, no PII
```

**Reporting**: Ahrefs MCP cannot pull this table (self-built), so `scripts/analytics-weekly.ts` pulls and aggregates it via the CF REST API.

### D2. Cross-domain visitor stitching (landing → demo)

- On first landing visit, write 1st-party cookie `ot_v=<uuid>` (`Domain=.opentoggl.com`, `SameSite=Lax`)
- On `/go/demo` redirect, pass `ot_v` as query: `track.opentoggl.com/?ot_v=<uuid>&src=<slot>`
- Inject a 20-line bootstrap in demo `src/main.tsx`: read `ot_v`/`src` → send a `first_visit` event to the 1st-party endpoint `track.opentoggl.com/api/ingress/first-visit` (new backend endpoint, log-and-return) → strip these two params from the URL (to avoid polluting routing)
- The same `visitor_id` can be joined between landing pageview and demo first_visit, yielding landing→demo conversion

### D3. `install_source` round-trip

- `update-worker` already has `recordUpdateRequest`. Add `install_source` / `install_campaign` query parameters
- Templatize install scripts: `curl install.sh | INSTALL_SOURCE=github_readme bash`; in docker-compose docs `x-install-source: docs_docker_compose`
- Add blob7/blob8 to update-worker Analytics Engine
- Weekly aggregation: "this week's new instances by source: github_readme=12 / docs_docker_compose=8 / unknown=34"

### D4. Demo first-visit self-reported source (per GOALS' PLG ingestion principle)

- Add a single-select to demo first onboarding: "How did you hear about OpenToggl?"
- Options: `ChatGPT/Claude/Perplexity/Gemini | GitHub | Google Search | X/Twitter | HackerNews | Reddit | Friend | Other`
- Write to `user_attribution` table (new in backend), one row per user
- This is the core patch for the `Recoverable` tier, covering "referer lost but user can tell us"

---

## Indirect effect tracking plan

### I1. SEO (Google Search Console + Bing Webmaster)

- Verify both properties `opentoggl.com` and `track.opentoggl.com` (DNS TXT, we already control DNS)
- Via Ahrefs MCP `gsc-keywords / gsc-pages / gsc-performance-history`, automatically pull weekly reports
- Four weekly charts:
  1. Brand-term (`opentoggl / open toggl / opentoggl self-hosted / 开源 toggl` etc.) impression/click trend
  2. Non-brand query Top 20 rise/fall (per locale)
  3. High-impression low-CTR queries (title/desc optimization leads)
  4. Page-level impression Top 20 (which locale landings are rising)
- Structured data audit: we already have `WebSite / Organization / FAQ` schema; include in monthly Search Console rich-results review

### I2. Brand-level signals

- Daily pull GitHub `repos/{owner}/{repo}` API → stars / forks / watchers, retain as `github_metrics_daily.jsonl`
- Weekly comparison: Brand Radar mention growth vs GitHub star growth vs GSC brand-term impression growth. GEO is working only when all three trend up together
- No GA or cookie-based brand fingerprinting

### Monitoring boundary explanation

In the OpenToggl scenario, GEO's **full value cannot be fully captured by the backend**. Typical unobservable sources:

- OpenToggl citations inside private ChatGPT Pro sessions
- After seeing an AI answer, users **don't click the link** but Google "opentoggl" directly the next day
- After seeing an AI recommendation, users **verbally recommend** to colleagues
- Self-host install is where "value is realized"; the install script source depends entirely on whether the user carried `INSTALL_SOURCE`

Hence the conservative `20%~30%` planning assumption **does not apply** — our official site ingestion is strong but subsequent install chains are scattered. We use the starting range for `overseas strong-ingestion, form-mature SaaS / PLG` and weight Unobservable more heavily.

### Observability estimate framework

| Tier | Planned range | Main drivers | Next-stage improvement actions |
|---|---|---|---|
| **Observed** | 25%~35% | `/go/:target` coverage, demo first-visit rate, install_source fill rate | Make install scripts carry source by default; switch all README outbound links to /go/ |
| **Recoverable** | 20%~30% | Demo first-visit survey response rate, issue / PR author self-report rate | Place the survey in a blocking-but-skippable spot; incentivize in onboarding copy |
| **Unobservable** | 40%~50% | AI private session citations, word-of-mouth spread, long-decision deals | Don't try to drive to 0; use brand-term / star weekly growth trend as proxy |

**Sum = 100%** (conservative lower bound 25%+20%+55% / upper bound 35%+30%+35%). These are the planning starting points, calibrated with real data 4-8 weeks after deployment.

---

## GEO monitoring plan (Ahrefs Brand Radar main path)

### G1. Prompt library (current v1)

Build repo file `docs/analytics/geo-prompts.yaml`, initial 30-50 entries grouped by theme:

- **Direct brand**: `What is OpenToggl? / Is OpenToggl free? / Who maintains OpenToggl?`
- **Comparison queries**: `Toggl Track alternative open source / self-hosted time tracker / free Clockify alternative / Harvest open source replacement`
- **Usage scenarios**: `best open-source time tracker for teams / self-hosted time tracker with API / time tracker I can deploy on my own server`
- **Chinese**: `有没有开源的 toggl 替代品 / 自托管时间追踪工具推荐 / 开源 Toggl`
- **Long-tail**: `time tracker that works with docker compose / ...`

Prompt library via PR review; rises/falls all go through git.

### G2. Brand Radar configuration

- Via Ahrefs MCP `management-brand-radar-prompts / management-brand-radar-reports`, sync the prompt library to Brand Radar
- Brands to monitor: `OpenToggl` (primary), `Toggl Track / Clockify / Harvest / Timely / TimeCamp` (competitors)
- Core metrics:
  - `mentions-overview`: weekly OpenToggl mention count
  - `sov-overview`: share of voice vs competitors
  - `cited-domains / cited-pages`: whose content AI is citing when mentioning OpenToggl (locating backlink value)

### G3. Outbound-action closed loop

When Brand Radar shows competitor SoV far exceeds ours on a class of prompts:

- If cited-pages point to awesome-list / comparison blog → do link outreach
- If AI describes us **incorrectly** in answers (version, license, feature) → optimize site FAQ / README tables so next AI indexing gets correct facts
- If almost no one is mentioned across a whole prompt class → consider writing a dual SEO + GEO-optimized article ourselves

---

## Attribution dictionary and data table design

Unify into one attribution dictionary; unified field set:

```text
inbound_event {
  event_id        uuid
  event_time      timestamptz
  event_type      enum(pageview, outbound_click, first_visit, install_ping, survey_answer)
  site            enum(landing, demo, github, update_worker)
  visitor_id      text         -- ot_v cookie, nullable for server-only events
  target          text         -- for outbound_click: github / demo / x
  slot            text         -- hero_cta / proof_card / readme
  locale          text         -- en / zh / ...
  referer_domain  text         -- github.com / chatgpt.com / perplexity.ai
  ai_platform     text         -- inferred from referer / survey answer
  country         text
  campaign        text         -- UTM-compatible field (external inbound still carries utm)
  raw_referer     text         -- for audit
}
```

Storage split strategy:

- `outbound_click` / `pageview(demo)` → CF Analytics Engine
- `first_visit / install_ping / survey_answer` → Postgres (same as business DB)
- `pageview(landing)` → Ahrefs Web Analytics (external, read-only)

The weekly report script pulls the three sources into a single duckdb view and produces charts.

---

## Priority roadmap

| Phase | Action | Owner | Acceptance |
|---|---|---|---|
| **P0 (this week)** | Build `/go/:target` Worker + allowlist + replace all landing outbound links | Landing team | Clicking hero CTA to GitHub results in a CF Analytics Engine entry with `slot=hero_cta` |
| **P0** | GSC / Bing Webmaster verification + weekly report script v1 | SEO owner | Automated report delivered every Monday |
| **P0** | `geo-prompts.yaml` v1 + Brand Radar prompt sync | GEO owner | Brand Radar shows OpenToggl weekly mention count |
| **P1 (2-3 weeks)** | Demo-side bootstrap ingress + cross-domain `ot_v` stitching | Demo team | Hero click on landing → demo sees a first_visit with the same visitor_id |
| **P1** | `install_source` param + install-script update + update-worker blob extension | Backend | `curl install.sh` carries `github_readme` source by default |
| **P2 (4-6 weeks)** | Demo onboarding first-visit survey + `user_attribution` table | Backend + frontend | >60% of new demo accounts answer the survey |
| **P2** | Weekly report visualization (duckdb view → Grafana/Metabase) | Analytics | One "GEO composite dashboard" per week |
| **P3 (on demand)** | `geo-prompts.yaml` rotation + monthly competitor SoV retrospective | GEO owner | Monthly SoV trend chart |

---

## Confidence and gaps

- **High confidence**: `/go/:target` redirector, GSC integration, Brand Radar integration — three mature paths
- **Medium confidence**: cross-domain visitor stitching; under Safari ITP / Firefox ETP, the `ot_v` cookie may be capped to 7 days, lossy for long-window attribution; acceptable
- **Low confidence**: `install_source` coverage depends on whether users customize install commands; not enforced, does not block releases
- **Information gaps**:
  - Actual traffic share of domestic GEO is unknown (wait for Brand Radar data before deciding whether to add domestic-platform monitoring)
  - Correlation between self-hosted instance "activity" and "source" is unknown (update-worker needs several more weeks of data)
  - Initial GEO prompt library needs 1-2 iterations to stabilize

---

## Consistency with docs / openapi

- New backend endpoints (`/api/ingress/first-visit`, `/api/attribution/survey`) **must first be written into `openapi/opentoggl-*.openapi.json`**, then code-generated (per CLAUDE.md "OpenAPI-first" rule)
- The `config/outbound-targets.json` allowlist format goes into `docs/analytics/outbound-config.md` (not built this phase; add after P0 completes)
- `geo-prompts.yaml` is the repo-versioned source of truth, and the Brand Radar console is the consumer, not the other way round
