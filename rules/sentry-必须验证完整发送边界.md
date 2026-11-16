---
id: local.sentry-envelope-privacy
title: Sentry 必须验证完整发送边界
level: warn
language: typescript
---

Sentry 隐私过滤必须覆盖最终 transport 的整个 envelope，包括 header trace / dynamic sampling context 和 event sdkProcessingMetadata。不得仅验证 event/span payload。使用 SDK 最终发送钩子按允许字段重建，并在真实 SDK transport 测试中给根、子 span、错误、嵌套字段及动态采样 metadata 放入敏感哨兵。

静态检查只覆盖本仓库关闭默认 integration 后忘记安装最终 envelope hook 的明确退化形式；真实 transport 哨兵测试仍是验收要求。

```grit
language js
`integrations: []` where {
  $filename <: r".*(packages/monitoring/src/browser|apps/update-worker/src/sentry)\.ts"
}
```
