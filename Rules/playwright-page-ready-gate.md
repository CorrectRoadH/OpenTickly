---
id: local.playwright-page-ready-gate
title: Wait for page ready gate after navigation
language: typescript
level: warn
status: draft
tags: [local, typescript, playwright, e2e]
---

# Wait for page ready gate after navigation

After `page.goto()` or `page.reload()`, wait for the page-level container `data-testid` before interacting with links, buttons, or route content. This protects tests from Suspense and loading overlays.

```grit
// TODO: Add GritQL when multi-statement ordering checks are supported well enough to avoid false positives.
```

## Bad

```ts
await page.goto("/overview");
await page.getByRole("link", { name: "Timer" }).click();
```

## Good

```ts
await page.goto("/overview");
await expect(page.getByTestId("workspace-overview-page")).toBeVisible();
await page.getByRole("link", { name: "Timer" }).click();
```
