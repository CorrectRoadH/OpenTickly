# AI 平台 referer 白名单

**用途**：查看 Ahrefs Web Analytics → Referrers 报表时，按下列域名筛选即可得到"来自 AI 平台的真实 inbound"。
**真相源**：本文件。平台新出或改域名时通过 PR 更新。
**相关**：[PLAN-4.md](PLAN-4.md) §4b / §GEO

---

## 海外 AI 平台

| 平台 | Referer 域名 | 泄露稳定性 |
|---|---|---|
| Perplexity | `perplexity.ai`, `www.perplexity.ai` | 高（几乎总带 referer）|
| ChatGPT | `chatgpt.com`, `chat.openai.com` | 中（copy link 场景会丢）|
| Google Gemini | `gemini.google.com` | 中 |
| Claude | `claude.ai` | 低（以引用文本为主、很少带链接）|
| Microsoft Copilot | `copilot.microsoft.com` | 中 |
| You.com | `you.com` | 中 |
| Phind | `phind.com` | 中（开发者受众相关）|
| Kagi Assistant | `kagi.com` | 低（付费小众）|

## 国内 AI 平台

| 平台 | Referer 域名 | 备注 |
|---|---|---|
| 字节豆包 | `doubao.com` | 需先确认 referer 是否在网页版会泄露 |
| Kimi | `kimi.moonshot.cn` | — |
| DeepSeek | `chat.deepseek.com` | — |
| 腾讯元宝 | `yuanbao.tencent.com` | — |

---

## 已知局限

- **iOS / Android app 内嵌浏览器**：多数 AI 平台的官方 app 打开外链时 referer 为空
- **"copy link"**：ChatGPT 等平台的复制链接功能会丢 referer
- **隐私浏览器 / 扩展**：会 strip referer header
- **HTTPS→HTTP 跳转**：浏览器默认丢 referer（OpenToggl 全站 HTTPS，不受影响）

---

## 使用方式

1. 登录 Ahrefs → Web Analytics → `opentoggl.com` → Referrers
2. 本周 / 本月报表里扫一遍 referer 列，匹配本白名单
3. 命中的就是"AI 平台真实引入流量"
4. 若看到白名单外的疑似 AI 域名，通过 PR 补充

---

## 与 Brand Radar 的关系

- **Brand Radar**：回答"AI 答案里提到 OpenToggl 多少次"（品牌层信号）
- **本白名单**：回答"有多少访客真的从 AI 答案点进来"（直接效果）
- 两者**不会对齐**：Brand Radar 的 mention 数通常 >> referer inbound 数，差额就是"被提到但没点链接"的 Unobservable 部分
