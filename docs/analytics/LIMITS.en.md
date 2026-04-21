**Related documents**:
- [GOALS.md](GOALS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)
- [DECISION.md](DECISION.md)

## Purpose

This file records the limits and boundaries of candidate traffic attribution / SEO / GEO solutions.
Organized by solution; does not write goals, does not write implementation steps; only writes what each is good at, what it is not good at, and what the resulting impact is.

---

# UTM + target-site referrer only (current state)

What landing currently does: attach UTM to outbound links and hope Ahrefs / GitHub break them out for us automatically.

## What it supports

- Lowest implementation cost; `appendUtm` helper already exists
- Works for **landing pages that can read UTM** (e.g. track.opentoggl.com, if we instrument it ourselves)
- Search engines typically preserve UTM without affecting canonical

## Limits

- **GitHub does not parse UTM**: all UTM-carrying GitHub outbound links end up in GitHub Traffic Insights as just "referrer = opentoggl.com"; `utm_medium=hero_cta` vs `utm_medium=proof_card` cannot be distinguished
- GitHub Traffic Insights retains only 14 days
- `track.opentoggl.com` currently has no analytics integrated; even if UTM comes in, it is not persisted
- UTM pollutes URLs and may reduce click-through intent for some users

## Direct impact

- "Which CTA is most effective" cannot be answered under the current state
- landing → demo conversion cannot be computed
- This is the **floor** of the current state; any plan must at minimum exceed it

---

# Self-hosted `/go/:target` click redirector + UTM

Idea: change all outbound links to GitHub / external repos to go through our own redirect, e.g. `opentoggl.com/go/github?ref=hero_cta`, log server-side then 302 to the target URL.

## What it supports

- **GitHub click attribution can be done at slot level** (hero vs proof card vs footer vs a specific section in docs)
- Data is entirely in our hands; retain as long as we want
- Fail-open: if the redirect service is down, we just lose the log, user still jumps to GitHub
- Landing side can join with Ahrefs Web Analytics pageview data
- Does not depend on client JS (works even under ad blockers because it's a server-side 302)

## Limits

- Need to maintain an `outbound_targets` allowlist (otherwise it becomes an open redirect, abused for phishing)
- Need a serverless endpoint that can write logs (Cloudflare Worker / Zeabur service)
- One extra hop; a very small fraction of security software may warn on the redirect domain
- Only solves "clicks going out from our site"; **does not solve** "direct GitHub visits from outside" — that part can only ever be seen in GitHub Insights
- Need all landing outbound link helpers to switch uniformly; no stragglers

## Direct impact

- Trades a modest engineering cost for otherwise-unattainable GitHub CTA slot-level data
- Introduces a long-term outbound service and allowlist to maintain

---

# Ahrefs Web Analytics (already integrated) + outbound events

Landing already loads `analytics.ahrefs.com/analytics.js` in `root.tsx`. Ahrefs comes with outbound link and custom event capability.

## What it supports

- pageview / referrer / country / device obtainable at zero cost
- Same console as Ahrefs' own Rank Tracker / Backlinks / Brand Radar; no tool switching to see SEO
- Can pull reports directly in the workflow generated from this doc via Ahrefs MCP (`mcp__claude_ai_Ahrefs__web-analytics-*`)
- Tag outbound links with `data-ahrefs-event` or call the JS API to record click events

## Limits

- Ad blockers intercept `analytics.ahrefs.com`; hit rate around 70-85% (loss is larger in open-source dev audiences)
- It's a 3rd-party script, mildly conflicting with the "privacy / open-source friendly" goal; needs a build switch to allow self-hosted deployments to skip loading
- Depends on Ahrefs subscription; data goes away if subscription stops
- No native support for GEO (AI answer exposure) itself — requires the separate Ahrefs Brand Radar product

## Direct impact

- Covers 80% of the landing / demo pageview + outbound click requirement
- What's left for self-built infrastructure is "GitHub outbound slot-level data for long-term retention / independent of Ahrefs subscription" — filled in by `/go/:target`

---

# Plausible self-hosted

Open source, cookie-less, 1st-party-domain reporting web analytics.

## What it supports

- Fully self-hosted, data in your own database
- 1st-party domain (`plausible.opentoggl.com/event`) bypasses most ad blockers
- Official support for outbound link, file download, custom event
- GDPR friendly, no cookie banner required
- GSC integration built-in; can see SEO query / page / impressions in the same UI

## Limits

- Self-hosting needs three components (ClickHouse + PostgreSQL + Plausible app); non-zero ops cost
- Managed version exists, but that returns to "data in 3rd party"
- No coverage of GEO / AI answer monitoring
- Overlaps in function with the already-integrated Ahrefs; must decide who is the source of truth

## Direct impact

- Pick one of it or Ahrefs Web Analytics; not worth running both
- If chosen, Ahrefs can be downgraded to a pure SEO/backlink tool

---

# PostHog self-hosted

Product analytics platform, event model + session replay + feature flag + funnel.

## What it supports

- Most complete event/user/funnel capability
- Can stitch session across landing → demo
- Can do cohort, retention, reverse funnel analysis
- Self-host controllable

## Limits

- **Too heavy**: GOALS explicitly says we do not do in-product tracking; most PostHog capabilities will sit idle
- Self-hosting depends on ClickHouse + Kafka + Postgres + Redis; ops burden is an order of magnitude higher than Plausible
- Cookies + localStorage, does not fit "privacy / open-source friendly" goal
- Session replay is of little value for an open-source project's landing

## Direct impact

- Unless we decide to do in-product tracking **at the same time**, PostHog is overkill
- Not recommended this phase

---

# Google Search Console / Bing Webmaster Tools

Official exposure / click / query data source provided by the search engines.

## What it supports

- Only authoritative data source for "how my pages actually perform on Google/Bing"
- Free, long-term retention (GSC 16 months)
- Splittable by query / page / country / device
- Ahrefs MCP already has `gsc-*` tools; can pull data directly

## Limits

- GSC data is aggregated + sampled; low-frequency queries will not appear
- Requires site ownership verification first (DNS TXT or HTML meta)
- No coverage of GEO (ChatGPT/Perplexity answer exposure) at all
- Does not tell you "clicked but did not convert" user follow-on behavior — must join with web analytics

## Direct impact

- Closed-loop SEO goal is basically impossible without this integration
- Must integrate, but only solves the SEO piece; does not cover outbound attribution or GEO

---

# Ahrefs Brand Radar (GEO-specific)

Ahrefs' AI Overview / ChatGPT / Perplexity exposure tracking product.

## What it supports

- Can monitor specified prompts' mention / citation data in AI answers
- Can see cited domains / cited pages, identifying whose content AI cites when mentioning OpenToggl
- Supports share of voice (competitor comparison)
- Ahrefs MCP tools available: `brand-radar-ai-responses / cited-domains / mentions-history / sov-*`

## Limits

- Requires manual configuration of "which prompts to monitor" — if prompts are chosen poorly, data has no signal
- Depends on whether the Ahrefs subscription tier includes Brand Radar
- Only covers publicly accessible AI platforms; private conversations in personal ChatGPT/Claude subscriptions are invisible
- Not real-time: prompt execution is scheduled in batches

## Direct impact

- The most realistic path for doing GEO this phase; self-building "run a batch of prompts to GPT/Claude/Perplexity daily" is feasible but engineering-heavy and API cost is not low
- The cost is continuous maintenance of the prompt library, otherwise data drifts into "only watching 5-year-old queries"

---

# Self-built GEO monitoring (LLM API polling)

Write your own cron to call OpenAI / Anthropic / Perplexity APIs daily with a fixed set of prompts and parse whether the answers mention OpenToggl and competitors.

## What it supports

- Full control of prompt list, frequency, parsing rules
- Can monitor platforms Brand Radar does not cover (e.g. internally deployed Claude)
- Custom data structures, easier to join with internal SEO reports

## Limits

- Requires long-term maintenance of prompt library, answer parser, hallucination handling, API cost
- Answers returned by APIs do not equal what real users see (A/B, personalization, RAG all cause differences)
- Still needs manual calibration of "is this a mention" rules in the short term
- Highly overlaps with Ahrefs Brand Radar unless Brand Radar cannot satisfy us

## Direct impact

- Not recommended short term: heavy engineering, uncertain output
- Long term, if Brand Radar is blocked by subscription or coverage, can serve as a supplement
