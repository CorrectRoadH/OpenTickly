# Import and Migration

## Goal

This volume defines the goals, default behavior, and user-visible results of `import` as a new business product capability added in the first version of OpenToggl.

## Scope

`import` is the new business capability in the first version that is allowed to go beyond Toggl's current public business product surface.

Strict inputs for this document:

- OpenToggl import-related OpenAPI
- The corresponding Figma import page prototype

## Product Goals

- Support importing Toggl exported data
- Complete the migration loop from Toggl to OpenToggl
- After import, normal access via public API and web UI
- After import, preserve original object IDs as much as possible
- After import, preserve reference relationships between objects as much as possible
- After import, ensure that existing scripts, links, external mappings, and report references continue to be valid as much as possible

## Product Rules

- The goal of `import` is not general-purpose ETL, but to complete the migration loop from Toggl to OpenToggl.
- After import completes, the data must be readable through public API, Web UI, and reports normally.
- import is not a one-off internal script, but a formal product capability; ID preservation, remap, state machine, failure details, and linkage rules must be explicitly defined in this PRD and the implementation.

## Edge Cases

- When partial success, conflicts, or linkage delays occur during import, the results must be explainable to the user.

## Required Product Capabilities

- Task status
- Failure details
- Conflict display
- Retryable
- Diagnostic capability

## Exported Data Structure

Based on real Toggl Track export samples, the export directory structure is:

```
toggl_workspace_{workspace_id}_export_{export_id}/
├── clients.json              # 客户端定义
├── projects.json             # 项目定义
├── tags.json                 # 标签定义
├── workspace_users.json      # 工作区成员列表
├── workspace_settings.json   # 工作区配置
├── alerts.json               # 警报配置(通常为空)
├── user_groups.json          # 用户组定义(通常为空)
└── projects_users/           # 项目成员目录
    ├── {project_id}.json     # 每个项目的用户分配
    └── ...
```

### Data Entities

#### Clients (`clients.json`)

```json
{
  "id": 57870165,
  "name": "个人",
  "wid": 3550374,
  "archived": false,
  "creator_id": 4970670,
  "total_count": 3
}
```

#### Projects (`projects.json`)

```json
{
  "id": 218647578,
  "name": "toggl CLI",
  "wid": 3550374,
  "workspace_id": 3550374,
  "cid": null,
  "client_id": null,
  "client_name": null,
  "active": true,
  "status": "active",
  "is_private": false,
  "billable": false,
  "color": "#06aaf5",
  "pinned": false,
  "can_track_time": true,
  "start_date": "2026-03-06",
  "actual_hours": 4,
  "actual_seconds": 17893,
  "estimated_hours": null,
  "estimated_seconds": null
}
```

#### Tags (`tags.json`)

```json
{
  "id": 7215643,
  "name": "1 象限",
  "workspace_id": 3550374,
  "creator_id": 4970670
}
```

#### Workspace Users (`workspace_users.json`)

```json
{
  "id": 5155401,
  "uid": 4970670,
  "wid": 3550374,
  "name": "CtRdH",
  "email": "a778917369@gmail.com",
  "active": true,
  "admin": true,
  "role": "admin",
  "timezone": "Asia/Shanghai"
}
```

#### Project Users (`projects_users/{project_id}.json`)

```json
{
  "id": 76387654,
  "project_id": 153406950,
  "user_id": 4970670,
  "workspace_id": 3550374,
  "manager": true,
  "rate": null
}
```

### Missing Data

Toggl Track exports **do not include**:

- **Time Entries**: Must be imported via a separate second step
- **User Groups**: Usually empty in the export
- **Alerts**: Usually empty in the export

## Import Strategy

To the user, the import consists of two independent steps, creating two independent import jobs.

### Stage 1: Entity Import

- The user enters an `organization name`
- The user uploads the Toggl export zip
- The backend creates a **new organization**
- The backend also creates a default workspace for this organization
- The backend imports the JSON entities inside the zip into this new workspace

Entity import order:

1. **Import Clients** → establish ID mapping
2. **Import Tags** → establish ID mapping
3. **Import Workspace Users** → establish ID mapping
4. **Import Projects** → resolve client references
5. **Import Project Users** → resolve project/user references

### Stage 2: Time Entry Import

- The user separately uploads time entries CSV on the import page
- This step imports into the workspace currently selected by the user
- This step does not create a new organization, nor does it reuse the zip content from stage 1

CSV import needs to resolve:

- Project references (match by name or create)
- Client references (match by name or create)
- Task references (match by name or create)
- Tag references (match by name or create)
- User ownership (match by workspace member email)
- Running entries (stop = null)

## ID Mapping

During the import process, maintain a bidirectional ID mapping:

```
toggl_client_id <-> opentoggl_client_id
toggl_project_id <-> opentoggl_project_id
toggl_tag_id <-> opentoggl_tag_id
toggl_user_id <-> opentoggl_user_id
toggl_time_entry_id <-> opentoggl_time_entry_id
```

Mapping uses:

- Incremental import (skip already-imported entities)
- Conflict resolution (detect duplicate imports)
- Reference resolution (link time entries to projects)

## Import Validation

### Pre-import Checks

- Validate export directory structure
- Validate JSON file integrity
- Check required files (`clients.json`, `projects.json`, `tags.json`)

### Post-import Checks

- Verify entity counts match the export
- Verify referential integrity (projects → clients, project_users → projects/users)
- Check for orphan references

## Error Handling

### Recoverable Errors

- **Missing client reference**: create a placeholder client or skip client assignment
- **Missing user reference**: skip project member assignment
- **Duplicate entity**: skip import, use the existing entity

### Fatal Errors

- **JSON corruption**: abort import, report file path
- **Missing required files**: abort import, report missing files
- **Database constraint violation**: abort import, roll back transaction

## Open Questions

- The precise granularity of import progress and the shape of failure details still need to be filled in further within dedicated contracts.

## Web Requirements

The web side must completely carry the formal capabilities of the `import` product surface; it is not allowed to downgrade the formal capabilities defined in this volume to one-off internal scripts or backend-only capabilities.

Formal pages and entry points on the web side include:

- Import page
- Import job list
- Conflict / failure diagnostics page
- Retry entry point
