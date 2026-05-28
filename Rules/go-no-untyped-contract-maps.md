---
id: local.go-no-untyped-contract-maps
title: Avoid untyped Go contract maps in API code and tests
language: go
level: warn
status: warn
tags: [local, go, typing, openapi]
---

# Avoid untyped Go contract maps in API code and tests

Go API code and tests should prefer OpenAPI-generated structs or explicit local structs over handwritten `map[string]any`, `map[any]any`, or `map[string]interface{}`. Keep dynamic maps at narrow adapter boundaries only when the external payload is inherently dictionary-shaped.

```grit
language go
or {
  `map[string]any`,
  `map[any]any`,
  `map[string]interface{}`
}
```

## Bad

```go
payload := map[string]any{"workspace_id": workspaceID}
```

## Good

```go
payload := opentogglweb.UpdateWorkspaceRequest{WorkspaceID: workspaceID}
```
