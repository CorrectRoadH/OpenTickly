---
id: local.audit-snapshot-tenant-scope
title: Audit snapshots must include tenant scope
language: go
level: error
tags: [local, go, security]
---

Audit snapshots must be authorized and constrained to the selected workspace.
A global entity ID is not sufficient authorization. Regression tests must also
prove rejected mutations cannot expose previous state and credentials are omitted.

```grit
language go
`"select row_to_json(t) from "+$table+" t where id = $1"`
```

## Bad

```go
pool.QueryRow(ctx, "select row_to_json(t) from "+table+" t where id = $1", id)
```

## Good

```go
pool.QueryRow(ctx, "select row_to_json(t) from "+table+" t where id = $1 and workspace_id = $2", id, workspaceID)
```
