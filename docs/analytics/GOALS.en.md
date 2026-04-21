**Related documents**:
- [LIMITS.md](LIMITS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)
- [DECISION.md](DECISION.md)

## Goals

This document records the goals OpenToggl needs to satisfy for **traffic-source analysis / SEO / GEO (Generative Engine Optimization)**.
Organized by goal; does not write specific tool choices, and does not mistake what's already integrated (Ahrefs Web Analytics, update-worker Analytics Engine) for goals.

---

## Scope (2026-04-18 narrowing)

The **only primary goal** of this phase is to establish click attribution and GEO observability for the landing site `opentoggl.com`.
Other goals are retained in the doc but explicitly marked as `optional` or `deferred`; no engineering effort is invested in this phase:

- `required`: landing's own pageview / outbound click / SEO / GEO
- `optional`: GitHub slot-level attribution (UTM is useless on GitHub, no `/go/:target` Worker; rely only on domain-level referrer from GitHub Traffic Insights)
- `deferred`: demo site `track.opentoggl.com` attribution (demo requires login, anonymous first-visit attribution needs a separate anonymous-session model design; out of scope this phase)
- `deferred`: self-hosted instance `install_source` reporting (requires install script changes + update-worker schema changes; sample size is still too small, wait for landing data first)

See [DECISION.md](DECISION.md) for decision rationale.

---

## Background: OpenToggl's three surfaces

OpenToggl's external traffic mainly lands on three entry points:

- **Landing**: `opentoggl.com` (React Router SSR, apps/landing)
- **Demo / App**: `track.opentoggl.com` (apps/website, SPA, `robots: noindex`)
- **GitHub repo**: `github.com/CorrectRoadH/opentoggl` (open source project home)

In addition:

- `apps/update-worker` already uses Cloudflare Analytics Engine for **install/version heartbeat** stats (instance_id / version / os / arch / country). This is about "self-deployed instance operating status" and is a separate concern from "web traffic attribution".
- `apps/landing` already has Ahrefs Web Analytics integrated (`analytics.ahrefs.com/analytics.js`).
- Landing's outbound links already carry `utm_source=opentoggl_landing` etc. on GitHub / demo links via `appendUtm`.

This goals document only cares about **web traffic attribution + search/AI exposure**; it does not discuss in-product events.

---

## Pain points already triggered

### UTM on GitHub outbound links essentially recovers no attribution

`home.tsx` attaches UTM such as `https://github.com/...?utm_source=opentoggl_landing&utm_medium=proof_card&...` to outbound links, but:

- GitHub does not feed these UTMs to our Ahrefs; GitHub's own Traffic Insights also aggregates only by referrer domain and cannot distinguish `utm_medium=hero_cta` from `utm_medium=proof_card`
- Result: today "GitHub clicks from opentoggl landing" yields only a grand total (referrer = opentoggl.com), without distinguishing hero, footer, or proof card as the most effective slot
- UTM pollutes the URL and may reduce click-through intent, without returning data

### Attribution gap between landing and demo

- A user searches Google to reach `opentoggl.com/zh`, clicks the hero CTA to `track.opentoggl.com` — attribution should be traceable across this jump
- Currently `track.opentoggl.com` is a `noindex` SPA with no web analytics and does not read + persist the UTM passed from landing
- Result: conversions like "how many search-sourced users actually reached demo" cannot be seen

### SEO data lacks a landing-page-level breakdown

- Ahrefs already covers rankings / backlinks, but Google Search Console / Bing Webmaster are not systematically integrated
- No one periodically answers SEO questions like "which queries are bringing traffic to landing, which pages are rising/falling, which locale landings have impressions but no clicks"
- There is no split view of SEO performance across multilingual landings (en/zh/es/ja/fr/ko/pl/pt)

### GEO exposure has no systematic tracking

- More and more users discover open-source tools via ChatGPT / Perplexity / Claude / Google AI Overview
- Today we **have no idea** whether OpenToggl is mentioned in these AI answers, which queries trigger mentions, or how it is described when mentioned
- Without GEO data, we cannot judge the real impact of actions like "writing tech blog posts, filling out docs, listing on awesome-list" on AI exposure

---

## Requirements

### GitHub traffic source should be separable by entry point (optional)

- Ideal state: answer "which on-site slot most effectively sends people to GitHub" (hero CTA vs proof card vs footer vs inline doc links)
- Ideal state: separate "GitHub visits from outside landing" (HN, Twitter, Chinese community, references from other open source projects)
- **Current accepted floor**: GitHub's own Insights > Traffic aggregates only by referrer domain and retains only 14 days; this is the ceiling of what's currently obtainable
- **Why optional**: UTM on github.com outbound links is useless for GitHub; getting slot-level data requires a self-hosted `/go/:target` redirect Worker; the ROI is evaluated as low at this stage, so it is not done

### Landing's own traffic sources need a systematic view (required)

- Daily distribution of landing visits across channels (organic / referral / social / AI / direct)
- Destinations and counts of landing-internal outbound clicks (aggregated by target: demo / github / x / docs etc.)
- Data should be splittable by **locale × source × landing page**, not just totals
- This layer must be closed-loop and is the core output of this phase

### landing → demo cross-domain attribution (deferred)

- Ideal state: cross-domain hops between landing / demo are stitched into one session (visitor id or UTM passthrough)
- Ideal state: answer "landing-to-demo click rate" and "what fraction of demo first visits come from a known landing campaign"
- **Why deferred**: `track.opentoggl.com` requires login, demo has no anonymous user session; associating `first_visit` with "pre-login visit → login" across sessions requires a dedicated anonymous visitor model and merge strategy. Start only once landing-side data proves landing→demo is a key path

### SEO data should be closed-loop (required)

- Systematically integrate Google Search Console (GSC) and Bing Webmaster Tools
- Should answer:
  - Each locale landing's impressions / clicks / CTR / average position
  - Rising/falling queries and pages (weekly trend)
  - Queries with impressions but no clicks (title/description optimization leads)
  - Which external sites/backlinks are bringing traffic to OpenToggl (Ahrefs covers this, needs cross-referencing with GSC)
- hreflang, canonical, and structured data of multilingual pages should be auditable (WebSite / Organization / FAQ schema already generated; this part should be included in the SEO report)

### GEO exposure should be observable (required)

- Should answer: **how many times OpenToggl is mentioned in ChatGPT/Perplexity/Claude/Google AI Overview answers, under which prompts, and how it is described**
- Should answer: **Share of Voice of competitors (Toggl Track, Clockify, Harvest, Timely) under the same prompts**
- Should distinguish "AI cites but without link" vs "AI cites with github/landing link"
- Data should drive actions: which doc to fill in, what kind of tech article to publish, which awesome-list to get onto in order to improve GEO hit rate

### Privacy / open-source friendly

- Do not introduce Google Analytics-style cookies and fingerprinting
- Data reporting must be 1st-party or self-hostable; do not sell user behavior to ad networks
- Any client-side tracker must be disableable at build time to make it easy for self-hosted deployers to run with no external analytics
- Ad-blocker hits on landing's tracker are expected losses; do not use domain cloaking to bypass

### Low running cost and operational burden

- New analytics infrastructure must not tie us to a system that requires long-term manual operations (DB, dashboards, upgrades)
- Each week, within 15 minutes, produce 4 views: "landing pageview trend + landing outbound click distribution + SEO rise/fall + new GEO mentions"
- Data retention at least 12 months to allow YoY comparison
- Any self-built redirector (e.g. `/go/:target` outbound redirect) must: on failure, fail-open 302 straight to the target URL, without impacting UX

### Auditable and version-controlled

- Attribution-related configuration (UTM conventions, outbound redirect allowlist, GSC property list, GEO monitoring prompts) must exist as files in the repo, not only in some SaaS console
- Every "add a CTA / add an outbound target" should be reviewable in a PR
- Metric definitions should be written into `docs/analytics/` so that "rose/fell" isn't confused by a silent definition change

---

## Non-goals

- **In-product tracking / funnel**: e.g. time-entry creation failure rate, calendar drag completion rate. This is an application telemetry problem, out of scope here.
- **User profiles / CRM**: no long-term profile building for logged-in users.
- **Ad-campaign attribution**: no paid ads run today; last-click attribution model is not this phase's problem.
- **Replacing Ahrefs**: Ahrefs remains the primary data source for SEO / backlinks / brand-radar; this doc discusses what Ahrefs does not cover.
- **No demo (track.opentoggl.com) attribution this phase**: demo requires login, anonymous→login merge strategy requires separate design; see [DECISION.md](DECISION.md).
- **No self-built `/go/:target` redirector this phase**: GitHub slot-level attribution ROI is insufficient to justify a new Worker; see [DECISION.md](DECISION.md).
