---
id: local.openapi-upstream-readonly
title: Keep upstream OpenAPI specs read-only
level: warn
status: draft
tags: [local, openapi, ownership]
---

# Keep upstream OpenAPI specs read-only

The upstream Toggl specs in `openapi/toggl-track-api-v9.swagger.json`, `openapi/toggl-reports-v3.swagger.json`, and `openapi/toggl-webhooks-v1.swagger.json` are external compatibility inputs and should not be edited. Work around upstream quirks in adapters or validators.

```grit
// TODO: Add GritQL or a path-aware harness check when changed-file path rules are supported.
```

## Bad

```text
Edit openapi/toggl-track-api-v9.swagger.json to match local code.
```

## Good

```text
Keep the upstream file unchanged and adapt local code around it.
```
