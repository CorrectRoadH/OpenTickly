# Membership and Access

## Goal

This volume defines members, roles, groups, private project authorization, and how they affect the visibility of tracking, reports, billing, and Webhooks.

## Scope

This document defines:

- Membership / Access Control
- Member rates and cost settings
- Roles, visibility, and private project authorization

## Object Scope

Must cover completely:

- `OrganizationUser`
- `WorkspaceUser`
- `Group`
- `GroupMember`
- `ProjectUser`
- `ProjectGroup`

## Lifecycle and Permissions

Must support:

- Lifecycle such as invite, join, remove, disable, restore
- Public role expression for owner / admin / member
- Member rate, cost, visibility, and access rules
- Private project permissions
- Policy bits such as admin-only creation, admin-only visibility
- Filtering, search, listing, and bulk operations related to member management

## Product Rules

- Roles such as owner / admin / member must be defined according to Toggl's current public definitions; they may not be arbitrarily simplified into fewer roles in the first version.
- Member status must at least distinguish: invited, joined, disabled, restored.
- Project-level authorization and group-level authorization must be formal product capabilities; permission isolation cannot rely solely on "not seeing the UI button".
- Access permissions for private projects must simultaneously affect:
  - Project visibility
  - time entry creatability
  - reports visibility
  - webhook event exposure
- Member rate and cost settings must have a consistent effect on billable, cost, and profitability.

## Product Constraints

- Member semantics must affect project visibility, time entry creatability, report visibility scope, Webhook event exposure, and profitability metrics.
- Member rate and cost settings must have a consistent effect on billable / profitability results.
- Disabled members must not continue to produce new business changes, but their historical business facts are preserved by default.

## Edge Cases

- Historical time entries of removed or disabled members are by default still retained in reports and audit results.
- If a member loses access to a private project, the ownership of historical time entries remains unchanged, but subsequent reads and visibility scope must be re-trimmed according to current permissions.
- When the three-layer relationship of organization members, workspace members, and project members conflicts simultaneously, the narrower business-scope rule should take precedence, rather than defaulting to the widest permission.

## Open Questions

- Whether Toggl has a stable public definition for an intermediate role such as project manager still needs further confirmation.
- The public field differences of certain member statuses between API and Web UI still need further collection.

## Web Requirements

The web side must completely carry the formal product capabilities defined in this volume; no formal capability defined in this volume is allowed to remain API-only.

Formal pages and entry points on the web side include:

- Organization member page
- Workspace member page
- Invitation status page
- Group management page
- Project member page
- Rate / cost settings page
- Permission configuration page
