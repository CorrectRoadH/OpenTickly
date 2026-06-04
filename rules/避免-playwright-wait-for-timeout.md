---
id: local.playwright-no-wait-for-timeout
title: 避免 Playwright waitForTimeout
language: typescript
level: warn
tags: [local, typescript, playwright, e2e]
---

# 避免 Playwright waitForTimeout

E2E 测试应使用带自动重试的断言等待状态信号，不应通过睡眠等待。唯一记录在案的例外是拖拽测试中用于鼠标步骤节奏的短暂等待。

```grit
language js
or {
  `$page.waitForTimeout(100)`,
  `$page.waitForTimeout(200)`,
  `$page.waitForTimeout(250)`,
  `$page.waitForTimeout(500)`,
  `$page.waitForTimeout(1000)`,
  `$page.waitForTimeout(delayMs)`,
  `$page.waitForTimeout(delay)`
}
```

## 反例

```ts
await page.waitForTimeout(1000);
```

## 正例

```ts
await expect(page.getByTestId("workspace-overview-page")).toBeVisible();
```
