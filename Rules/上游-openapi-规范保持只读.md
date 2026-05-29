---
id: local.openapi-upstream-readonly
title: 上游 OpenAPI 规范保持只读
level: warn
status: draft
tags: [local, openapi, ownership]
---

# 上游 OpenAPI 规范保持只读

`openapi/toggl-track-api-v9.swagger.json`、`openapi/toggl-reports-v3.swagger.json` 和 `openapi/toggl-webhooks-v1.swagger.json` 中的上游 Toggl 规范是外部兼容性输入，不应编辑。上游规范的特殊情况应在适配器或校验器中处理。

```grit
// TODO: 等支持变更文件路径规则后，再补充 GritQL 或路径感知的 harness 检查。
```

## 反例

```text
编辑 openapi/toggl-track-api-v9.swagger.json 以匹配本地代码。
```

## 正例

```text
保持上游文件不变，并在本地代码中适配它。
```
