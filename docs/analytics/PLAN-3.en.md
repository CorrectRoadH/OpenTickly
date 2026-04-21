**Requirements**: [GOALS.md](GOALS.md)
**Limits**: [LIMITS.md](LIMITS.md)
**Decision**: [DECISION.md](DECISION.md) (current main path is [PLAN-4](PLAN-4.md); this document is kept as reference for "should we add a GitHub slot-attribution Worker")

---

## Implementation plan 3 (minimal closed loop)

### Summary

Do only three things: ① add a `/go/:target` 1st-party redirector to solve GitHub outbound link slot-level attribution; ② chain Ahrefs MCP's GSC tools into a weekly report script run manually; ③ enable Ahrefs Brand Radar with an initial 30 prompts. **Do not** do demo analytics, **do not** do cross-domain visitor stitching, **do not** do install_source, **do not** do first-visit survey, **do not** do Plausible self-hosted. Goal: go live within 1 week, take the cheapest ROI, and let real data speak before deciding whether to upgrade to PLAN-1 / PLAN-2. Unresolved: landing→demo conversion, self-deploy install source, the full chain from AI answer to final install; all fall into the Unobservable tier.

---

## What to do

### 1. `/go/:target` redirector (~2 days)

- Cloudflare Worker, route `opentoggl.com/go/:target`
- Allowlist just 3: `github / github-issues / demo`
- Analytics Engine schema: `index1=target, blob1=slot, blob2=locale, blob3=referer_path, blob4=country, blob5=ua_family`
- All outbound links in landing `home.tsx` / `footer.tsx` switch from `appendUtm(...)` to `buildGoUrl(...)`
- UTM parameters are **stripped** from outbound links (URLs become clean)

### 2. SEO weekly report script (~1 day)

- `scripts/analytics/seo-weekly.ts`: calls Ahrefs MCP `gsc-keywords / gsc-pages / gsc-performance-history`
- Output: markdown weekly report, stored as `docs/analytics/reports/seo-YYYY-Www.md`
- Fields: brand-term impressions / clicks / CTR, non-brand query Top 10 rise/fall, high-impression low-CTR list (Top 5)
- Run `opentoggl.com` as one property first; `track.opentoggl.com` is noindex, skip

### 3. Initial Brand Radar prompts (~half day)

- `docs/analytics/geo-prompts.yaml` v0, 20-30 entries (see example in PLAN-1 G1)
- Sync prompts to Brand Radar via Ahrefs MCP
- Once a week manually check `brand-radar-mentions-overview / sov-overview`, append results to `docs/analytics/reports/geo-YYYY-Www.md`

### 4. Parts keeping status quo

- Ahrefs Web Analytics stays **as-is** on landing (pageview foundation unchanged)
- Demo site stays **without analytics** (known gap, untouched in P0)
- update-worker stays **as-is** (no install_source added)

---

## What is not done (and why)

| Not done | Why |
|---|---|
| Demo-side Ahrefs / Plausible | Needs `apps/website` bootstrap changes, handling noindex, cross-domain design; can't be done in 1 week; defer until there's real conversion pressure |
| Cross-domain visitor stitching | Same as above, and Safari ITP compresses cookie TTL; unstable ROI |
| `install_source` param | Needs install script + update-worker schema + doc changes; broad surface; we don't yet know self-deploy user distribution |
| Demo first-visit survey | Needs onboarding UX investment; discuss after demo has analytics |
| Plausible self-hosted | Ops burden >> current data-volume return |
| Self-built GEO LLM polling | Heavy overlap with Ahrefs Brand Radar |

---

## Observability estimate (layering under PLAN-3)

Relative to PLAN-1, under PLAN-3 the Observed tier shrinks and Unobservable expands:

| Tier | PLAN-1 range | PLAN-3 range | Source of difference |
|---|---|---|---|
| **Observed** | 25%~35% | **10%~20%** | No demo pageview, no install_source, no cross-domain stitching |
| **Recoverable** | 20%~30% | **5%~15%** | No first-visit survey; patch techniques are basically only "issue authors self-report" |
| **Unobservable** | 40%~50% | **65%~80%** | The long chain from AI answer → install is entirely invisible |

**Conclusion**: PLAN-3 fits only as a **learning-phase** configuration. After 4-8 weeks in production, retrospect:

- If `/go/:target` GitHub click volume proves landing→GitHub is the main traffic path → top up per PLAN-1
- If Brand Radar shows OpenToggl is already frequently mentioned in AI answers → prioritize adding demo first-visit survey to recover source
- If neither has signal → means upstream exposure is not enough yet; go back to content / backlinks first, not an attribution problem

---

## Priority roadmap

| Phase | Action | Duration |
|---|---|---|
| **P0 Day 1-2** | Worker + allowlist + landing outbound link replacement + go live | 2 days |
| **P0 Day 3** | SEO weekly report script + first output | 1 day |
| **P0 Day 4** | `geo-prompts.yaml` + Brand Radar sync + first query | half day |
| **P0 Day 5** | Consolidate the three weekly reports into `docs/analytics/reports/INDEX.md` | half day |
| **Observation window** | Run 4-8 weeks, accumulate data | 1-2 months |
| **Retrospect** | Decide to upgrade to PLAN-1 or stay on PLAN-3 | 1 day |

---

## When to choose PLAN-3

- The team wants to start collecting data this week and doesn't have a two-week window for a full solution
- Want to first validate "is anyone actually clicking the CTAs on landing" before investing in bigger infrastructure
- The team is unfamiliar with Plausible / Brand Radar and wants to build intuition via the smallest action first

## When not to

- You've decided to use demo as the conversion hub and have a KPI on conversion → go directly to PLAN-1
- Strong privacy posture is core to product positioning → go directly to PLAN-2
- Someone has complained "we don't know which CTA works" for more than 4 weeks → PLAN-3's pace is too slow

---

## Upgrade path

PLAN-3 → PLAN-1: top up starting from PLAN-1's P1 priority (cross-domain stitching → install_source → first-visit survey → dashboard). The `/go/:target` and `geo-prompts.yaml` built in PLAN-3 are **directly reused** in PLAN-1 with no rework.

PLAN-3 → PLAN-2: extra step "deploy Plausible + landing/demo integration + deprecate Ahrefs Web Analytics"; everything else remains the same.
