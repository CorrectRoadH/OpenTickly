---
id: local.go-no-untyped-contract-maps
title: 避免 Go API 契约使用无类型 map
language: go
level: warn
status: warn
tags: [local, go, typing, openapi]
---

# 避免 Go API 契约使用无类型 map

Go API 代码和测试应优先使用 OpenAPI 生成的结构体或显式本地结构体，不要手写 `map[string]any`、`map[any]any` 或 `map[string]interface{}`。只有外部载荷本身就是字典形状时，才把动态 map 保留在最窄的适配器边界。

```grit
language go
or {
  `map[string]any`,
  `map[any]any`,
  `map[string]interface{}`
}
```

## 反例

```go
payload := map[string]any{"workspace_id": workspaceID}
```

## 正例

```go
payload := opentogglweb.UpdateWorkspaceRequest{WorkspaceID: workspaceID}
```
