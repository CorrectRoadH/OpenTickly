---
id: local.go-pointer-helper-style
title: 使用 lo 指针辅助函数
language: go
level: warn
tags: [local, go, style]
---

# 使用 lo 指针辅助函数

指针辅助转换应使用 `github.com/samber/lo` 提供的 `lo.ToPtr`、`lo.FromPtr` 和 `lo.FromPtrOr`，不要新增本地一次性辅助函数。

该规则只匹配明确的一次性指针 helper 形态，避免把必要的跨类型转换 helper 误报为简单指针辅助函数。

```grit
language go
or {
  `func ptr[$T any]($value $T) *$T { return &$value }`,
  `func ptr($value $T) *$T { return &$value }`,
  `func strPtr($value string) *string { return &$value }`,
  `func stringPtr($value string) *string { return &$value }`,
  `func boolPtr($value bool) *bool { return &$value }`,
  `func timePtr($value time.Time) *time.Time { return &$value }`
}
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
