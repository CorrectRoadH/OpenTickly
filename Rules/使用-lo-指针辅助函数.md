---
id: local.go-pointer-helper-style
title: 使用 lo 指针辅助函数
language: go
level: warn
status: draft
tags: [local, go, style]
---

# 使用 lo 指针辅助函数

指针辅助转换应使用 `github.com/samber/lo` 提供的 `lo.ToPtr`、`lo.FromPtr` 和 `lo.FromPtrOr`，不要新增本地一次性辅助函数。

```grit
// TODO: 等梳理完本地指针辅助函数的名称和形态后，再补充 GritQL；宽泛匹配取地址表达式会产生太多噪音。
```

## 反例

```go
func ptr[T any](value T) *T {
  return &value
}
```

## 正例

```go
value := lo.ToPtr("workspace")
```
