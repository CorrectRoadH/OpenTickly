---
id: local.playwright-no-wait-for-timeout
title: Avoid Playwright waitForTimeout
language: typescript
level: warn
status: warn
tags: [local, typescript, playwright, e2e]
---

# Avoid Playwright waitForTimeout

E2E tests should wait for state signals with auto-retry assertions instead of sleeping. The only documented exception is short mouse-step timing in drag-and-drop tests.

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

## Bad

```ts
await page.waitForTimeout(1000);
```

## Good

```ts
await expect(page.getByTestId("workspace-overview-page")).toBeVisible();
```
