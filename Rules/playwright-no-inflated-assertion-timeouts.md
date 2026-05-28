---
id: local.playwright-no-inflated-assertion-timeouts
title: Avoid inflated Playwright assertion timeouts
language: typescript
level: warn
status: warn
tags: [local, typescript, playwright, e2e]
---

# Avoid inflated Playwright assertion timeouts

If Playwright's default 5s assertion timeout is not enough, fix the app readiness signal instead of raising locator assertion timeouts.

```grit
language js
or {
  `{ timeout: 10_000 }`,
  `{ timeout: 10000 }`,
  `{ timeout: 15_000 }`,
  `{ timeout: 15000 }`
}
```

## Bad

```ts
await expect(page.getByText("Loaded")).toBeVisible({ timeout: 10_000 });
```

## Good

```ts
await expect(page.getByTestId("workspace-overview-page")).toBeVisible();
await expect(page.getByText("Loaded")).toBeVisible();
```
