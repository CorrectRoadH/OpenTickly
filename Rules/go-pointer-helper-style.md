---
id: local.go-pointer-helper-style
title: Use lo pointer helpers
language: go
level: warn
status: draft
tags: [local, go, style]
---

# Use lo pointer helpers

Use `lo.ToPtr`, `lo.FromPtr`, and `lo.FromPtrOr` from `github.com/samber/lo` for pointer helper conversions instead of adding local one-off helpers.

```grit
// TODO: Add GritQL once local pointer helper names and shapes are surveyed; a broad address-of pattern would be too noisy.
```

## Bad

```go
func ptr[T any](value T) *T {
  return &value
}
```

## Good

```go
value := lo.ToPtr("workspace")
```
