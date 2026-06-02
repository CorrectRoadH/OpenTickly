---
id: local.agent-workflow-use-vp-toolchain
title: 使用 vp 执行 JS 和 TS 工具链命令
language: json
level: warn
tags: [local, workflow, vite-plus]
---

# 使用 vp 执行 JS 和 TS 工具链命令

所有 JS/TS 包管理、测试、lint、格式化、构建、开发服务器和一次性二进制命令都应通过 `vp` 执行。Agent 在仓库工作期间不应直接调用 `node`、`vitest`、`vite`、`playwright`、`pnpm`、`npm` 或 `yarn`。

```grit
language json
or {
  `"pnpm $command"`,
  `"npm $command"`,
  `"yarn $command"`,
  `"vitest $command"`,
  `"vite $command"`,
  `"playwright $command"`
} where {
  $filename <: r".*package\.json"
}
```

## 反例

```text
pnpm test
npm run build
playwright test
```

## 正例

```text
vp test
vp run build -r
vp exec playwright test
```
