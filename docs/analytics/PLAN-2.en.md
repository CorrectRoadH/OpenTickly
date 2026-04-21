**Requirements**: [GOALS.md](GOALS.md)
**Limits**: [LIMITS.md](LIMITS.md)
**Decision**: [DECISION.md](DECISION.md) (current main path is [PLAN-4](PLAN-4.md); this document is the self-hosted Plausible alternative path)

---

## Implementation plan 2 (self-hosted first)

### Summary

Use **self-hosted Plausible** in place of Ahrefs Web Analytics as the unified pageview / outbound foundation for both landing + demo; everything else (`/go/:target` redirector, GSC/Bing, Brand Radar, `install_source`, demo first-visit survey) is the same as PLAN-1. Core difference: pageview and outbound click data all live in OpenToggl's own Plausible instance and no longer depend on Ahrefs Web Analytics; the Ahrefs subscription downgrades to a pure SEO + Brand Radar tool. Unresolved: the Plausible instance itself requires long-term ops (ClickHouse + PostgreSQL), and the GEO portion, like PLAN-1, still depends on Ahrefs Brand Radar.

---

## Differences from PLAN-1

PLAN-2 only changes the **direct / indirect effect monitoring foundation** layer; all other decisions are reused from PLAN-1:

| Module | PLAN-1 | PLAN-2 |
|---|---|---|
| landing pageview | Ahrefs Web Analytics | **self-hosted Plausible** |
| demo pageview | self-built 1st-party endpoint | **same Plausible instance** (`track.opentoggl.com` registered as a second site) |
| outbound click | Analytics Engine (CF Worker) | **Plausible `outbound-link-click`** built-in event + `/go/:target` still retained (see below) |
| cross-site stitching | `ot_v` cookie | Plausible's native same-root-domain sessions; cross-subdomain out of the box |
| SEO | GSC + Ahrefs MCP | **Plausible Search Console integration** + native GSC + Ahrefs MCP (as backup) |
| GEO | Ahrefs Brand Radar | **same as PLAN-1** (no replacement for Brand Radar) |
| privacy posture | 3rd-party Ahrefs JS | **1st-party domain + no cookie** (cleanest for GDPR) |

---

## Why we still keep `/go/:target`

It looks like Plausible's `outbound-link-click` built-in event could replace `/go/:target`, but **it can't**:

1. **Ad blocker hits**: though self-hosted Plausible supports custom paths, the `plausible.js` script is still intercepted by some ad blockers based on filename signature; estimated intercept rate 15%~30%
2. **Server-side events**: references to `opentoggl.com/go/github` from README / docs / external sites do not depend on any client JS; it's logged before a server-side 302. Ad blockers cannot affect it
3. **Long-term log retention**: Plausible retains event data by default, but OpenToggl may want raw outbound-click records persisted independently of Plausible upgrades/rollbacks

So `/go/:target` remains in PLAN-2 and is **double-written** alongside Plausible's `outbound-link-click`:

- When the client is reachable: Plausible records one `outbound-link-click` + Worker records one
- When the client is unreachable (ad blocker): only Worker records one
- The weekly report aligns the two; the delta is the "actual pageview count intercepted by ad blockers" — itself a valuable signal

---

## Plausible self-hosted deployment

### Deployment form

- New service: `plausible.opentoggl.com`
- Stack: Plausible CE + PostgreSQL + ClickHouse (docker-compose or Zeabur template)
- Recommended placement on the same root domain as landing, to ensure 1st-party cookie / request domain
- Plausible reporting endpoint: `plausible.opentoggl.com/api/event`
- Script path **customized**: `opentoggl.com/a.js` reverse-proxies to Plausible to bypass filename-based ad blocker rules (hit rate drops from ~30% to <5%)

### Integration

- `apps/landing/app/root.tsx`: remove `analytics.ahrefs.com/analytics.js`, replace with a custom script tag pointing to `/a.js`
- `apps/website/src/main.tsx`: load the same script in the bootstrap (demo registered as Plausible's second site)
- `track.opentoggl.com`'s `noindex` does not affect Plausible reporting

### Ops boundaries

- Plausible CE release cadence ~1-2 times/month; upgrade window <10 minutes, not heavy
- ClickHouse partitions need archiving once per quarter (not a problem at OpenToggl's traffic scale)
- Backup: weekly full + daily incremental ClickHouse → S3 (Cloudflare R2 is fine)
- Monitoring: Plausible has health endpoint; include in internal uptime monitoring

---

## SEO integration differences

- Plausible officially supports GSC integration: authorize GSC in the Plausible console → see query / page / CTR / average position directly in the same panel
- Benefit: SEO + Web analytics in one view, less tool switching
- Cost: Plausible's GSC view lacks Ahrefs's higher-end analytics like opportunity score / SERP feature recognition. That portion still goes through Ahrefs
- **Decision**: routine daily viewing in Plausible (convenient), deep insight in Ahrefs (depth)

---

## Budget and cost comparison

| Item | PLAN-1 | PLAN-2 |
|---|---|---|
| Ahrefs subscription | full subscription (Web Analytics + Brand Radar + GSC + Rank Tracker) | keep subscription but Web Analytics capability idle; room to downgrade |
| Self-host infrastructure | only `/go/:target` Worker (low cost) | Plausible + ClickHouse + PG, CF Worker (extra 4-8 USD/month on Zeabur) |
| Initial integration effort | ~1 week | ~2 weeks (adds Plausible deployment + migration) |
| Data sovereignty | Ahrefs holds pageview | **fully held by OpenToggl** |

---

## When to choose PLAN-2

- Product value proposition requires emphasizing "self-hosted, privacy-friendly" (aligned with OpenToggl brand)
- Willing to own Plausible self-hosted ops
- Hope to eventually **show a live dashboard on landing** (Plausible supports public dashboards) as dogfooding proof
- Do not want pageview data bundled with Ahrefs subscription

## When not to

- No one to take over Plausible upgrades / backups
- Only want to solve GitHub CTA attribution in the short term → go PLAN-3
- Ahrefs subscription cost can't be compressed → adding another stack is just complexity

---

## Other parts

`/go/:target` redirector, `install_source` extension, demo first-visit survey, GEO prompt library, Brand Radar configuration, `Observed/Recoverable/Unobservable` observability estimate, data table design, priority roadmap are **entirely reused from PLAN-1**. See the relevant sections in [PLAN-1.md](PLAN-1.md).
