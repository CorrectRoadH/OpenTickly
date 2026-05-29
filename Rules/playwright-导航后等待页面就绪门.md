---
id: local.playwright-page-ready-gate
title: Playwright 导航后等待页面就绪门
language: typescript
level: warn
status: draft
tags: [local, typescript, playwright, e2e]
---

# Playwright 导航后等待页面就绪门

在 `page.goto()` 或 `page.reload()` 之后，与链接、按钮或路由内容交互前，应先等待页面级容器的 `data-testid`。这可以避免测试受到 Suspense 和加载遮罩影响。

```grit
// TODO: 等多语句顺序检查足够可靠、可以避免误报后，再补充 GritQL。
```

## 反例

```ts
await page.goto("/overview");
await page.getByRole("link", { name: "Timer" }).click();
```

## 正例

```ts
await page.goto("/overview");
await expect(page.getByTestId("workspace-overview-page")).toBeVisible();
await page.getByRole("link", { name: "Timer" }).click();
```
