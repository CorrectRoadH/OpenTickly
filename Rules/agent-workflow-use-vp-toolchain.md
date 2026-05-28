---
id: local.agent-workflow-use-vp-toolchain
title: Use vp for JS and TS toolchain commands
level: warn
status: draft
tags: [local, workflow, vite-plus]
---

# Use vp for JS and TS toolchain commands

All JS/TS package, test, lint, format, build, dev-server, and one-off binary commands should go through `vp`. Agents should not invoke `node`, `vitest`, `vite`, `playwright`, `pnpm`, `npm`, or `yarn` directly during repository work.

```grit
// TODO: Add GritQL once repository command strings can be matched without flagging Docker packaging and documentation examples.
```

## Bad

```text
pnpm test
npm run build
playwright test
```

## Good

```text
vp test
vp run build -r
vp exec playwright test
```
