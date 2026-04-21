# AI Platform Referer Allowlist

**Purpose**: When reviewing the Ahrefs Web Analytics → Referrers report, filtering by the domains below gives you "real inbound traffic from AI platforms".
**Source of truth**: This file. Update via PR when platforms launch or rename domains.
**Related**: [PLAN-4.md](PLAN-4.md) §4b / §GEO

---

## Overseas AI platforms

| Platform | Referer domain | Leakage stability |
|---|---|---|
| Perplexity | `perplexity.ai`, `www.perplexity.ai` | High (nearly always carries referer) |
| ChatGPT | `chatgpt.com`, `chat.openai.com` | Medium (lost in copy-link scenarios) |
| Google Gemini | `gemini.google.com` | Medium |
| Claude | `claude.ai` | Low (mostly quoted text, rarely links) |
| Microsoft Copilot | `copilot.microsoft.com` | Medium |
| You.com | `you.com` | Medium |
| Phind | `phind.com` | Medium (developer-oriented audience) |
| Kagi Assistant | `kagi.com` | Low (paid, niche) |

## Domestic AI platforms

| Platform | Referer domain | Notes |
|---|---|---|
| ByteDance Doubao | `doubao.com` | Need to confirm whether the web version actually leaks referer |
| Kimi | `kimi.moonshot.cn` | — |
| DeepSeek | `chat.deepseek.com` | — |
| Tencent Yuanbao | `yuanbao.tencent.com` | — |

---

## Known limitations

- **In-app browsers on iOS / Android**: most AI platforms' official apps send an empty referer when opening external links
- **"Copy link"**: ChatGPT and similar platforms' copy-link feature drops the referer
- **Privacy browsers / extensions**: strip the referer header
- **HTTPS→HTTP redirects**: browsers drop the referer by default (OpenToggl is HTTPS site-wide, so this doesn't apply)

---

## How to use

1. Log in to Ahrefs → Web Analytics → `opentoggl.com` → Referrers
2. In the weekly / monthly report, scan the referer column and match against this allowlist
3. Hits are "real inbound traffic from AI platforms"
4. If you see a suspected AI domain not on the allowlist, add it via PR

---

## Relation to Brand Radar

- **Brand Radar**: answers "how many times is OpenToggl mentioned in AI answers" (brand-level signal)
- **This allowlist**: answers "how many visitors actually click through from AI answers" (direct effect)
- The two **will not align**: Brand Radar mention counts are typically >> referer inbound counts; the gap is the Unobservable slice of "mentioned but not clicked"
