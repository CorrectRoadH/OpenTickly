**Requirements**: [GOALS.md](GOALS.md)
**Limits**: [LIMITS.md](LIMITS.md)
**Decision**: [DECISION.md](DECISION.md)

---

## Implementation plan 4 (recommended / minimal landing)

### Summary

Do attribution for only one site: `opentoggl.com` landing. **No Worker, no backend change, no update-worker change, no demo change, no weekly report script.** All data is viewed in the Ahrefs console:
- landing pageview / referrer / country: Ahrefs Web Analytics (already loaded, view directly)
- landing outbound click: Ahrefs outbound link report + attach a harmless `?s=<slot>` query param to CTA URLs so Ahrefs auto-splits by the full URL
- SEO: connect Google Search Console to Ahrefs; SEO data is also viewed in Ahrefs
- GEO (AI answer exposure): Ahrefs Brand Radar + `docs/analytics/geo-prompts.yaml` as the prompt library source of truth
- GEO (AI-platform inbound): Ahrefs Referrers report, manually filtered by the `docs/analytics/ai-referers.md` allowlist

Unresolved: absolute precision of GitHub slot-level attribution (ad blockers still affect Ahrefs hit rate) and landing→demo conversion; both are marked as `optional` / `deferred` in `GOALS.md`.

**Code changes**: `apps/landing/app/routes/home.tsx` + `apps/landing/app/components/footer.tsx`, about 15-20 lines.
**Platform config**: connect GSC to Ahrefs, configure Brand Radar prompts.
**Repo additions**: `docs/analytics/ai-referers.md`, `docs/analytics/geo-prompts.yaml`.

---

## Differences vs other plans

| Module | PLAN-1 | PLAN-3 | PLAN-4 (this plan) |
|---|---|---|---|
| landing pageview | Ahrefs | Ahrefs | **Ahrefs** (unchanged) |
| landing outbound click | `/go/:target` Worker | `/go/:target` Worker | **CTA carries `?s=<slot>` param + Ahrefs outbound report** |
| GitHub slot-level attribution | ✅ precise | ✅ precise | ✅ trend-level (affected by ad blocker) |
| demo-side analytics | ✅ | ❌ | ❌ (deferred) |
| cross-domain visitor stitching | ✅ | ❌ | ❌ (deferred) |
| install_source | ✅ | ❌ | ❌ (deferred) |
| demo first-visit survey | ✅ | ❌ | ❌ (deferred) |
| SEO | GSC + MCP weekly-report script | GSC + MCP weekly-report script | **GSC connected to Ahrefs, viewed in console** |
| GEO (AI answer exposure) | Brand Radar + prompt library | Brand Radar + prompt library | **Brand Radar + prompt library** (unchanged) |
| GEO (AI-platform inbound) | referer allowlist | referer allowlist | **referer allowlist cheat-sheet** (manually viewed) |
| new code infrastructure | Worker + Postgres + handler | Worker | **0** |
| main repo artifacts | multiple service changes | Worker + config | **2 docs files + 1 home.tsx change** |
| engineering effort | ~4 weeks | ~1 week | **half day - 1 day** |

---

## Questions it can answer and cannot answer

### ✅ Can answer (all in the Ahrefs console)

- landing daily/weekly pageview trend, split by locale × page × country
- channel distribution (organic / referral / social / AI / direct)
- outbound click comparison in landing across `?s=hero` vs `?s=footer` vs `?s=proof_card` (split by URL)
- GSC queries: brand-term impressions / clicks / CTR, non-brand Top query, page-level impressions
- Brand Radar: OpenToggl's mentions / SoV / cited-pages in ChatGPT / Gemini / Perplexity / Claude
- How many visitors to landing have referer from AI platforms (filter Referrers report by `ai-referers.md` allowlist)

### ❌ Cannot answer (accepted this phase)

- Which of hero CTA vs footer CTA gets **precisely** more clicks (20-35% lost under ad blockers, only trend is reliable)
- Of users clicking the demo link, how many actually logged into the demo
- Where self-hosted instances saw the install command
- The conversion portion where AI answers mention OpenToggl but users didn't click a link

---

## Core design

### 1. Attach harmless `?s=<slot>` query param to CTAs (the only landing code change)

Ahrefs Web Analytics outbound reports aggregate by **full URL**. As long as the same target uses different URLs in different slots, Ahrefs automatically splits them into two records.

```tsx
// apps/landing/app/routes/home.tsx
const githubHref = "https://github.com/CorrectRoadH/opentoggl?s=hero";
const demoHref = appendUtm("https://track.opentoggl.com", {
  source: "opentoggl_landing",
  medium: "hero_cta",
  campaign: "try_demo",
  content: locale,
});
// Keep demo UTM as the initial signal for future P1 landing→demo attribution
```

**Naming convention**:

```
?s=hero
?s=proof_card
?s=footer
?s=faq
?s=nav_header
```

**Why `?s=` instead of `?utm_*`**:
- `utm_*` misleads non-analytics users into thinking GA is reading it
- A single character `s=` is short, explicitly means "slot", and GitHub preserves it as-is without affecting redirects
- Ahrefs splits by full URL in the outbound report; what you see is two entries `.../opentoggl?s=hero` and `.../opentoggl?s=footer`

### 2. Remove UTM from GitHub outbound links

Delete the entire `utm_source / utm_medium / utm_campaign / utm_content` block attached to GitHub URLs in `home.tsx` proof_items.
UTM is useless on GitHub; it only pollutes the URL and may hurt CTR.

UTM on demo outbound links is **kept**, because it will serve as an initial cross-domain signal when P1 demo attribution starts in the future.

### 3. Platform-side configuration (Ahrefs console, zero code)

#### 3a. Connect GSC to Ahrefs

- Ahrefs console → Integrations → Google Search Console → Connect
- Authorize the `opentoggl.com` property
- After authorization, GSC's query / page / impression / click / CTR data is viewed in Ahrefs in the same UI
- No separate GSC account or weekly report script required

#### 3b. Brand Radar prompt configuration

- Ahrefs console → Brand Radar → Prompts
- Add prompts one by one from `docs/analytics/geo-prompts.yaml`
- Brands to monitor: `OpenToggl` (primary) + `Toggl Track / Clockify / Harvest / Timely / TimeCamp` (competitors)
- Default frequency: weekly

### 4. Repo artifacts: two docs sources of truth

#### 4a. `docs/analytics/geo-prompts.yaml`

Prompts configured in the Brand Radar console take **this file as the source of truth**; prompt changes go through PR review. v1 has about 30 entries, grouped:

```yaml
# docs/analytics/geo-prompts.yaml
brand_direct:
  - What is OpenToggl?
  - Is OpenToggl free?
  - Who maintains OpenToggl?
  - Is OpenToggl really open source?
comparison:
  - Toggl Track alternative open source
  - Self-hosted time tracker
  - Free Clockify alternative
  - Harvest open source replacement
scenario:
  - Best open-source time tracker for teams
  - Self-hosted time tracker with API
  - Docker-compose time tracker
  - Time tracker for freelancers self-hosted
chinese:
  - 有没有开源的 toggl 替代品
  - 自托管时间追踪工具推荐
  - 开源 toggl
```

#### 4b. `docs/analytics/ai-referers.md`

The Ahrefs Referrers report is displayed **by referer domain**. To manually filter "AI-platform inbound", you need to know which domains count as AI platforms. This cheat-sheet is the allowlist:

```markdown
# AI-platform referer allowlist

When viewing the Ahrefs Web Analytics Referrers report, filter by the domains below to get "real inbound from AI platforms".
Update via PR when platforms launch or change domains.

## Overseas

- chatgpt.com, chat.openai.com      — ChatGPT
- perplexity.ai, www.perplexity.ai  — Perplexity (most stable referer)
- gemini.google.com                 — Google Gemini
- claude.ai                         — Anthropic Claude
- copilot.microsoft.com             — Microsoft Copilot
- you.com                           — You.com
- phind.com                         — Phind
- kagi.com                          — Kagi Assistant

## Domestic

- doubao.com                        — ByteDance Doubao
- kimi.moonshot.cn                  — Kimi
- chat.deepseek.com                 — DeepSeek
- yuanbao.tencent.com               — Tencent Yuanbao

## Limits

- ChatGPT loses referer in "copy link" scenarios
- iOS in-app browsers often have an empty referer
- Perplexity has the highest hit rate, ChatGPT next, Claude the least stable
```

---

## Weekly data-viewing SOP (15 minutes)

Log in to the Ahrefs console and view 4 views in order:

1. **Web Analytics → Overview**: pageview / visitor trend, check health
2. **Web Analytics → Referrers**: cross-reference `ai-referers.md` allowlist for AI-platform inbound; cross-reference `google / bing / duckduckgo` for organic
3. **Web Analytics → Outbound Links**: view the distribution of clicks for `?s=hero` / `?s=footer` / `?s=proof_card` to GitHub and demo
4. **Brand Radar → Mentions + SoV**: view OpenToggl's vs competitors' AI-answer appearance trend

After viewing, if you want a record, take screenshots and store in `docs/analytics/reports/YYYY-Www.md` (gitignored, optional).

**No weekly report script needed**: the Ahrefs console itself is the dashboard; scripts are only needed when the data source isn't in Ahrefs.

---

## How each required goal is satisfied

| required goal | where to view | what to do |
|---|---|---|
| landing pageview / referrer distribution | Ahrefs → Web Analytics | 0 |
| landing outbound click distribution by slot | Ahrefs → Outbound Links | attach `?s=<slot>` to CTAs |
| SEO (GSC impressions / CTR / query / page) | Ahrefs → Integrations → GSC view | connect GSC |
| GEO (AI answer mention / SoV) | Ahrefs → Brand Radar | configure prompts |
| GEO (real AI-platform inbound traffic) | Ahrefs → Referrers | maintain `ai-referers.md` allowlist |

---

## Observability estimate framework (this phase)

After introducing "Ahrefs referer allowlist" as a direct-observation layer, PLAN-4's three-tier allocation is adjusted upward compared to the previous version:

| Tier | Range | Main drivers | Improvement actions |
|---|---|---|---|
| **Observed** | 25%~35% | Ahrefs script hit rate (ad blocker), CTA slot coverage, AI referer leakage rate | Attach `?s=` slot to all CTAs; keep `ai-referers.md` maintained |
| **Recoverable** | 5%~15% | sporadic self-reported sources in GitHub issues / Discussions | Add "How did you find OpenToggl" to issue template |
| **Unobservable** | 50%~70% | AI private sessions, word of mouth, referer loss in iOS in-app browsers | Don't aim for zero; use GSC brand-term + Brand Radar mention trend as proxy |

Lower-bound 25+5+70=100, upper-bound 35+15+50=100.

**The 10 extra points over the previous version** come from the AI referer allowlist: previously "AI-platform inbound visits" fell into Unobservable; now the portion where referer is preserved (rough estimates: Perplexity ~80%, ChatGPT ~40%, Claude ~20%) becomes Observed.

---

## Priority roadmap

| Phase | Action | Acceptance | Duration |
|---|---|---|---|
| **P0 Day 1 morning** | Edit `home.tsx` + `footer.tsx`: attach `?s=<slot>` to CTA URLs + remove GitHub UTM | Clean git diff, landing runs locally | 1-2 hours |
| **P0 Day 1 morning** | Create `docs/analytics/ai-referers.md` | File committed | 15 min |
| **P0 Day 1 afternoon** | Create `docs/analytics/geo-prompts.yaml` v1 (30 entries) | File committed | 1 hour |
| **P0 Day 1 afternoon** | Ahrefs console: connect GSC to `opentoggl.com` | GSC data visible in Ahrefs | 30 min (including sync wait) |
| **P0 Day 1 afternoon** | Ahrefs console: add 30 prompts from `geo-prompts.yaml` to Brand Radar | Brand Radar shows this week's queries | 30 min |
| **Observation window** | Run 4-8 weeks; view per SOP weekly | — | 1-2 months |
| **Retrospect** | Decide upgrade per the "Triggers" in [DECISION.md](DECISION.md) | Update DECISION.md | — |

**Total less than 1 day** (not counting DNS / GSC data-sync wait time).

---

## Upgrade path

PLAN-4 → PLAN-3: add `/go/:target` Worker. Applies when ad blockers make outbound data untrustworthy and precise slot attribution is needed.

PLAN-4 → PLAN-1 P1: add demo 1st-party ingress endpoint + anonymous→login merge. Applies when landing→demo conversion becomes an OKR.

PLAN-4 → PLAN-2: swap Ahrefs Web Analytics for self-hosted Plausible. Applies when strong privacy posture is part of product positioning.

These three upgrade paths do not conflict with each other; PLAN-4's `geo-prompts.yaml` / `ai-referers.md` / CTA slot convention are 100% reused.

---

## Gaps and risks

- **Ad blocker loss**: the open-source developer audience has above-average ad blocker usage, so Ahrefs Web Analytics hit rate may be 60-75%; `?s=<slot>` outbound splits are affected too
- **Uneven AI referer leakage**: Perplexity is stable, ChatGPT medium, Claude poor; Brand Radar mention counts and referer inbound counts will be systematically offset
- **Brand Radar subscription tier**: confirm whether the current Ahrefs subscription includes Brand Radar; if not, GEO monitoring downgrades to just the referer allowlist
- **GSC data delay**: data arrives T+2 days
- **Prompt library quality**: the 30 prompts in v1 are a starting point, not an answer; iterate prompts based on Brand Radar cited-pages in the first 2-4 weeks
- **Single-source risk**: all data sits with Ahrefs; if Ahrefs goes down or subscription stops, you lose pageview / SEO / GEO simultaneously; this risk is accepted in the PLAN-4 phase; if it becomes blocking, move to PLAN-2
