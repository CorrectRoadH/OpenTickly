---
id: local.playwright-no-inflated-assertion-timeouts
title: 避免 Playwright 断言超时膨胀
language: typescript
level: warn
tags: [local, typescript, playwright, e2e]
---

# 避免 Playwright 断言超时膨胀

如果 Playwright 默认 5 秒断言超时不够，应修复应用就绪信号，而不是提高 locator 断言超时时间。

```grit
language js
or {
  `await expect($locator).toBeVisible({ timeout: $timeout })`,
  `await expect($locator).not.toBeVisible({ timeout: $timeout })`,
  `await expect($locator).toHaveCount($count, { timeout: $timeout })`,
  `await expect($locator).toHaveText($text, { timeout: $timeout })`,
  `await expect($locator).toContainText($text, { timeout: $timeout })`,
  `await expect($locator).toHaveValue($value, { timeout: $timeout })`,
  `await expect($locator).toBeEnabled({ timeout: $timeout })`,
  `await expect($locator).toBeDisabled({ timeout: $timeout })`
} where {
  $filename <: r".*apps/website/e2e/.*\.spec\.ts",
  $timeout <: r"^(10_000|10000|15_000|15000)$"
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
