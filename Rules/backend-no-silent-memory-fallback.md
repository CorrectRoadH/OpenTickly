---
id: local.backend-no-silent-memory-fallback
title: Do not silently fall back to in-memory stores
language: go
level: warn
status: draft
tags: [local, go, config, runtime]
---

# Do not silently fall back to in-memory stores

Backend runtime startup must require explicit datasource configuration from environment and fail immediately when it is missing. In-memory stores are test fixtures or explicitly selected development tools, not silent production fallbacks.

```grit
// TODO: Add GritQL after the datasource construction paths are stable enough to identify fallback branches without flagging tests.
```

## Bad

```go
if databaseURL == "" {
  store = memory.NewStore()
}
```

## Good

```go
if databaseURL == "" {
  return Config{}, errors.New("DATABASE_URL is required")
}
```
