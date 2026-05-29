---
id: local.playwright-no-inflated-assertion-timeouts
title: 避免 Playwright 断言超时膨胀
language: typescript
level: warn
status: warn
tags: [local, typescript, playwright, e2e]
---

# 避免 Playwright 断言超时膨胀

如果 Playwright 默认 5 秒断言超时不够，应修复应用就绪信号，而不是提高 locator 断言超时时间。

```grit
language js
or {
  `{ timeout: 10_000 }`,
  `{ timeout: 10000 }`,
  `{ timeout: 15_000 }`,
  `{ timeout: 15000 }`
}
```

## 反例

```ts
await expect(page.getByText("Loaded")).toBeVisible({ timeout: 10_000 });
```

## 正例

```ts
await expect(page.getByTestId("workspace-overview-page")).toBeVisible();
await expect(page.getByText("Loaded")).toBeVisible();
```
