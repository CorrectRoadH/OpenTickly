# Onboarding

## Goal

Guide new users and new administrators through the key setup steps from registration/login to normal use of OpenToggl.

Onboarding is not a one-time popup or a fixed tutorial, but a role-based checklist embedded at the top of the `/overview` page, which can be closed after completion.

## Scope

This document covers:

- Admin onboarding (workspace admin / instance owner)
- User onboarding (regular member)
- Persistence of onboarding state (backend, per user + workspace)
- UI placement and interaction

This document does not cover:

- Instance bootstrap (see `instance-admin.md`)
- Import product capability details (see `importing.md`)

## Product Rules

- Onboarding is a formal product capability, not a temporary banner.
- Onboarding state must be persisted on the backend and visible across devices.
- Admin and User see different onboarding checklists.
- Role determination is based on the `role` field of the current workspace (`admin` vs other).
- Each step can be manually marked as completed by the user, or automatically detected as completed by the system.
- After all steps are completed, the onboarding checklist is automatically hidden.
- The user can dismiss (close) the onboarding at any time; the dismissed state is persisted.

## Onboarding Steps

### Admin Steps

| Step ID | Label | Description | Auto-detect |
|---------|-------|-------------|-------------|
| `import_data` | Import data from Toggl | Upload Toggl exported data to complete migration | The current workspace has a successful import job |
| `configure_workspace` | Configure your workspace | Set workspace name, currency, permissions, etc. | workspace settings have been modified (non-default values) |
| `invite_team` | Invite team members | Invite team members to join the workspace | workspace member count > 1 |
| `connect_cli` | Connect AI/CLI | Configure API token, install toggl-cli | Manually marked |

### User Steps

| Step ID | Label | Description | Auto-detect |
|---------|-------|-------------|-------------|
| `import_data` | Import your data | Import personal Toggl data | The user has a successful import job |
| `connect_cli` | Connect AI/CLI | Configure API token, install toggl-cli | Manually marked |
| `start_tracking` | Start tracking time | Create the first time entry | The user has at least one time entry |

## State Model

Onboarding state is stored along the `(user_id, workspace_id)` dimension.

```
OnboardingState {
  steps: [
    { step_id: string, completed: boolean }
  ]
  dismissed: boolean
}
```

- The `completed` of each step in `steps` can be set to true manually by the user, or automatically detected by the backend.
- `dismissed` indicates that the user closed the onboarding and it should no longer be shown.
- After dismissal, the user can still reopen it (via some entry point on the overview page).

## API

The onboarding state is exposed via the Web API, belonging to `opentoggl-web.openapi.json`.

### GET `/web/v1/workspaces/{workspace_id}/onboarding`

Returns the onboarding state of the current user in that workspace.

Response:
```json
{
  "steps": [
    { "step_id": "import_data", "label": "Import data from Toggl", "completed": false, "href": "/workspaces/123/import" },
    { "step_id": "configure_workspace", "label": "Configure your workspace", "completed": true, "href": "/workspaces/123/settings" },
    { "step_id": "invite_team", "label": "Invite team members", "completed": false, "href": null },
    { "step_id": "connect_cli", "label": "Connect AI/CLI", "completed": false, "href": null }
  ],
  "dismissed": false
}
```

- The content of `steps` differs by user role (admin vs user).
- `href` is an optional navigation target; null indicates an in-place action.

### PUT `/web/v1/workspaces/{workspace_id}/onboarding`

Update the onboarding state.

Request:
```json
{
  "steps": [
    { "step_id": "connect_cli", "completed": true }
  ],
  "dismissed": false
}
```

- `steps` is a partial update; only the steps to modify need to be passed.
- `dismissed` is a full-value field.

Response: The same full state as GET.

## UI

### Placement

The onboarding checklist is placed above the grid on the `/overview` page, after `PageHeader` and before the dashboard grid.

### Layout

- Top: progress indicator ("2 of 4 completed") + dismiss button
- Middle: checklist items; each item has a checkbox, label, and optional action button
- The action button differs by step type:
  - `import_data` → "Go to import" link
  - `configure_workspace` → "Go to settings" link
  - `invite_team` → open invite dialog
  - `connect_cli` → expand CLI configuration instructions (API token + install command)
  - `start_tracking` → "Start timer" button

### States

- **Active**: checklist visible, has incomplete steps
- **Completed**: all steps completed, show a brief congratulations and then auto-hide
- **Dismissed**: manually closed by the user, not shown

## Web Requirements

The web side must completely carry the onboarding product capability. The onboarding checklist is a formal component of the `/overview` page, not a temporary banner or toast.

## Edge Cases

- After a user is demoted from admin to member, onboarding should recompute steps (by the new role).
- After a new workspace is created, that workspace's onboarding state starts from zero.
- After import completes, the `import_data` step should be automatically marked as completed (detected at the next GET).
