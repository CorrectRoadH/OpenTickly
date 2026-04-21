**Related documents**:
- [GOALS.md](GOALS.md)
- [LIMITS.md](LIMITS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)

## Purpose

This document does not redefine goals, nor does it re-state the implementation details of each plan.

It only answers 4 questions:

- Why the attribution scope is narrowed to just the landing site in this phase
- Which PLAN is currently recommended as the main path
- Why GitHub slot-level attribution and demo-side attribution are deferred
- Under what conditions the recommendation may change

---

## Decision summary (2026-04-18)

- **Scope**: This phase only does click attribution and GEO observability for `opentoggl.com` (landing)
- **Recommended main path**: [PLAN-4](PLAN-4.md) landing-only, no Worker, no backend changes
- **Deferred**: GitHub slot-level attribution (optional), demo-side attribution (deferred), self-hosted `install_source` (deferred)
- **Retained**: SEO weekly report (GSC + Ahrefs MCP), GEO monitoring (Ahrefs Brand Radar + `geo-prompts.yaml`)

---

## Why the scope is narrowed to a single landing site

### Demo requires login; anonymous→login merging is an independent design problem

- `track.opentoggl.com` requires login to access feature pages
- Even if you pass landing's `ot_v` cookie or query parameter to the demo URL, the demo has **no anonymous session** at the first moment where this `first_visit` could be written
- To get this right, you must design an "anonymous visitor_id → post-login user_id" merge strategy, similar to Segment's identify / alias model; this is not something you can solve by "adding one endpoint"
- Investing in this design before landing's real click data supports the ROI is over-engineering

### UTM on GitHub is useless, and building a Worker has unclear ROI

- For links like `github.com/...?utm_source=opentoggl_landing&utm_medium=hero_cta`, GitHub itself does not feed UTM into any analytics system, so we can't get them
- To get slot-level data (hero vs footer vs proof_card), you must self-host an `opentoggl.com/go/:target` redirect Worker
- The biggest unknown at this stage isn't "which CTA is most effective", but "is anyone clicking, and does AI actually mention OpenToggl"
- Use the lightest approach first to get the order of magnitude, then decide whether to invest in Worker infrastructure

### Landing itself already has enough infrastructure to carry the required goals

- Ahrefs Web Analytics is already loaded in `apps/landing/app/root.tsx`; pageview / referrer / country / outbound click work out of the box
- The Ahrefs subscription already covers Brand Radar / GSC / Rank Tracker / Site Explorer
- So this phase **does not need any new 1st-party server**; landing as a pure static site can complete the required goals
- Landing is an `ssr: false` + prerender static site; this fact turns from a limitation into a simplification: with no server, there is no operational burden

---

## Current recommendation: PLAN-4

[PLAN-4](PLAN-4.md) is [PLAN-3](PLAN-3.md) with the `/go/:target` Worker removed, plus an Ahrefs outbound-event convention on the landing side:

| Action | From | Do it? |
|---|---|---|
| Ahrefs Web Analytics outbound event convention (tag CTAs with `data-ahrefs-event` or similar) | New | ✅ |
| GSC / Bing weekly report script v1 | PLAN-3 | ✅ |
| `geo-prompts.yaml` v1 + Brand Radar sync + weekly mention / SoV snapshot | PLAN-3 / PLAN-1 | ✅ |
| `/go/:target` redirect Worker | PLAN-3 / PLAN-1 | ❌ (optional, deferred) |
| demo-side Ahrefs / 1st-party endpoint | PLAN-1 | ❌ (deferred) |
| Cross-domain `ot_v` visitor stitching | PLAN-1 | ❌ (deferred) |
| `install_source` + update-worker blob extension | PLAN-1 | ❌ (deferred) |
| demo first-visit survey + `user_attribution` table | PLAN-1 | ❌ (deferred) |
| Plausible self-hosted | PLAN-2 | ❌ (unnecessary) |

### The lightest landing-side click attribution

Since `/go/:target` is not built, landing's outbound click attribution **relies entirely on Ahrefs Web Analytics' outbound tracking**:

- Ahrefs by default records all `<a href="http...">` clicks as outbound events
- You can tag CTAs in `home.tsx` / `footer.tsx` (e.g. `data-ahrefs-event="cta_github_hero"`) to distinguish slots
- The lost portion (ad blocker hits, JS not loaded) falls into the "temporarily unobservable" tier, using SEO brand-term traffic / Brand Radar mentions as a proxy

### The GEO portion is identical to PLAN-1

- `geo-prompts.yaml` as the repo-versioned source of truth
- Brand Radar as the consumer, monitoring mentions and cited-pages on the four major platforms: ChatGPT / Gemini / Perplexity / Claude
- Weekly SoV comparison, monthly prompt library calibration

---

## Observability estimate adjustments after this scope narrowing

[PLAN-1.md](PLAN-1.md) plans Observed / Recoverable / Unobservable ranges of `25-35 / 20-30 / 40-50`; that's the state after the full solution is deployed.

After this scope narrowing, the scope is only landing, so the three-tier allocation should be understood as follows:

| Tier | Range (this phase) | Notes |
|---|---|---|
| Observed | 15%~25% | landing pageview + outbound click via Ahrefs; loses demo first_visit and install_source |
| Recoverable | 5%~15% | only sporadic self-reported sources in GitHub issues / Discussions, no systematic survey |
| Unobservable | 60%~80% | AI private sessions, word of mouth, demo post-login without source, self-hosted without source |

**Lower-bound sum 15+5+80=100%, upper-bound sum 25+15+60=100%**. These are starting planning assumptions, to be calibrated 4-8 weeks after deployment with real data.

**The significantly higher Unobservable share is intentional**: the goal of this phase is to get the order of magnitude of exposure, not the full attribution picture; the "invisible portion" is explained indirectly through trends in GSC brand-term queries and Brand Radar mentions.

---

## Under what conditions the recommendation may change

### Trigger → launch PLAN-1 P1

Any of the following:

- Ahrefs shows a stable volume of outbound clicks from landing (> 200 CTA clicks/week), and demo links account for > 30% → worth adding demo-side anonymous attribution
- Brand Radar shows OpenToggl is stably mentioned across multiple overseas platforms (> 10 mentions/week), and cited-pages point to landing → worth adding the demo first-visit survey to recover the "recommended by AI but no link" portion
- GitHub stars' weekly growth rate is significantly higher than landing pageview's weekly growth rate → indicates GitHub has an independent traffic source, worth building `/go/:target` to distinguish hero / footer / readme and other slots

### Trigger → launch PLAN-2 (Plausible self-hosted)

- Product positioning publicly emphasizes "privacy-friendly / self-hostable", and someone is willing to own Plausible self-hosted ops
- Or the Ahrefs subscription cost needs to shrink, but web analytics capability must be retained

### Trigger → abandon the current narrow scope, return to the full PLAN-1

- The team decides "discovered via AI → try demo → convert to self-hosted user" as the OKR main-line path
- The product has explicit KPIs on "growth attribution accuracy"

---

## Execution order

Execute per the [PLAN-4](PLAN-4.md) roadmap:

1. Update `apps/landing/app/routes/home.tsx` + `components/footer.tsx`: attach `?s=<slot>` param to CTA URLs + remove UTM from GitHub outbound links (keep UTM on demo outbound links)
2. Create `docs/analytics/ai-referers.md` (AI platform referer allowlist cheat-sheet)
3. Create `docs/analytics/geo-prompts.yaml` v1 (30 prompts)
4. Ahrefs console: connect GSC to `opentoggl.com`
5. Ahrefs console: add the prompts from `geo-prompts.yaml` to Brand Radar

Completing the above 5 items is the completion of this phase. **No weekly report scripts**; each week spend 15 minutes on the Ahrefs console per the PLAN-4 SOP.

Observation window 4-8 weeks, then decide whether to upgrade per the "Trigger" conditions above.
