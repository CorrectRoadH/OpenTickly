# Identity and Tenant

## Goal

This volume defines users, accounts, organization, workspace, and their directly visible behaviors. It does not discuss code ownership here — only how the product behaves.

## Scope

This document defines the following product surfaces:

- Identity / Account
- Organization / Workspace
- Account-level semantics in the user lifecycle

## Identity / Account

Must cover completely:

- User registration, login, logout
- Account profile read and update
- Current user information
- User preferences
- API token management and usage
- `Basic auth(email:password)` public entry point
- `Basic auth(api_token:api_token)` public entry point
- Session public entry point
- Account-related public security status fields
- Error codes and return structures related to identity, session, and account

## Product Rules

- Public login methods are defined based on Toggl's current public definitions, including password login, API token usage, and session entry points.
- Identity must expose both API and Web entry points externally; low-frequency account management capabilities are not allowed to be hidden as API-only.
- User preferences, current user information, and account security state must be formal product objects, not merely frontend cache state.

## Organization / Workspace

Must cover completely:

- Organization CRUD
- Workspace CRUD
- Organization and workspace relationships
- Organization-level and workspace-level settings
- Public configuration items such as default currency, default rate, rounding, display strategies
- Workspace logo, avatar, brand resources
- Workspace user and organization user management
- Invitations and member states
- Workspace fields related to plans, limits, and available capabilities
- Low-frequency fields in workspace public objects, such as CSV upload status

## Workspace / Organization Rules

- `organization` and `workspace` are both formal product resources.
- organization is responsible for carrying cross-workspace management and aggregation perspectives.
- workspace is responsible for carrying most daily business objects and operation entry points.
- If the same class of business state is visible under both organization and workspace, the workspace view is by default understood as the public expression of the organization-level contract from the workspace perspective, not a separate source of truth.
- The workspace's default currency, default rate, rounding, display strategy, and other settings must affect the public behavior of tracking and reports.
- The web session's `current workspace` / `session home` is just the current default context, used to determine the shell's default landing, creation target, and current display reference; it is not the authorization boundary of the public API.
- Whether the current user has access to a given workspace must be determined by that user's real membership / ownership in that workspace, not by "whether this workspace belongs to the organization of the current session home."
- After the user switches to another organization or workspace, other previously accessible organization / workspace resources must not lose access as a result; public interfaces that explicitly carry `workspace_id` or `organization_id` should still be judged by the true access permission of the target resource.
- When the user has no saved `default_workspace_id`, the web shell must treat the first organization in that user's accessible list as the only default organization, rather than mistaking the currently temporarily selected organization for the default.
- The organization switcher may only show a single `Default` marker at any moment; the currently selected organization needs a check marker at the end of its row to indicate the current context, and must not conflate "currently selected" and "default organization" into the same semantic.
- Non-default organizations only show the `Set to default` action when their row is hovered, and that action only updates the default organization — it does not change the currently accessible organization list.

## User Lifecycle

- User deactivation and deletion must be defined as formal product semantics, not implementation details.
- Deactivation (deactivated) and deletion (deleted) must be distinguished:
  - Deactivation means the account can no longer log in, create, or modify business objects, but historical data is preserved.
  - Deletion must not cascade-delete historical time entries, expenses, approvals, audit records, and other generated business facts by default.
- Historical data of deactivated users should still be visible in lists, reports, approvals, and audits, and must express their inactive status according to the referenced public definitions.
- If a user has a running timer at the time of deactivation, the system should automatically stop that timer when deactivation takes effect, to avoid continuing to generate dirty data.
- For the "true deletion" public behavior, if the current public definition cannot prove that Toggl physically purges historical facts, OpenToggl defaults to the conservative strategy of "identity no longer reusable, but historical business facts preserved."
- If the above rules conflict with later explicitly confirmed Toggl public behavior, the updated public semantics shall take precedence.

## Edge Cases

- Historical time entries, expenses, approvals, and audit logs of deactivated users remain visible by default.
- When a deactivated user is restored, the running timer that was stopped by the system at deactivation is not automatically restored.
- When an organization / workspace is deleted or deactivated, its historical business facts are not automatically inferred to disappear from reports.

## Open Questions

- Whether Toggl actually physically purges all historical business facts on "true user deletion" still needs further confirmation.
- The precise differences in certain low-frequency fields under the organization and workspace dual entry points still need further confirmation from public sources.

## Page Mapping (Figma / Screenshot)

### Figma Prototype Reading Rules

- The Figma file referenced by this document is `https://www.figma.com/design/IiuYyZAD0bWx9C8BxetnFc/OpenToggl`.
- When reading identity-and-tenant-related prototypes, do not guess page ownership from the metadata of the whole `Page 1`; use the page entry points recorded in this volume directly.
- This volume only records two page entry points, `profile` and `settings`; other pages under the same Figma page such as timer, project, client, integrations webhooks are not covered in this volume.

### Choose MCP Entry by Target Page

- When account-scoped workspace context overview is needed, use the `overview` layer in the same Figma file; if the node id has not been pinned in this document yet, first align by layer name `overview` and screenshot fallback — do not fall back to the timer page.
- When the current user profile and personal preferences page is needed, call `profile` directly, node `10:14814`.
- When the workspace / organization settings page is needed, call `settings` directly, node `11:3680`.
- If the requirement discusses the current workspace context under the account entry, organization/workspace overview, or current access scope, default to `overview` rather than `timer` or `settings`.
- If the requirement discusses account profile, preferences, security status, or user self-service entry, default to `profile`.
- If the requirement discusses workspace / organization configuration, default currency, default rate, rounding, display strategy, logo / avatar, etc., default to `settings`.
- If this document already provides a node id, call `get_metadata` / `get_design_context` / `get_screenshot` directly against that node — do not first run full metadata on `Page 1` and then rely on text search to find the page.
- If the target page is not `overview`, `profile`, or `settings`, then this PRD is not the source of MCP entry; return to the corresponding product PRD to retrieve the node.

### Overview

- Figma: the `overview` layer in the same file
- Screenshot fallback: [shell-overview.png](../testing/evidence/ui-parity-baseline/shell-overview.png)
- Product meaning: This is the account-level `overview` page, used to display the current organization / workspace context and the current access scope; it is separated from `timer` and does not carry the time-entry main workflow.
- URL constraint: The upstream entry point is `https://track.toggl.com/overview`. This is an account-level page and is not entered via `workspace_id`.
- Implementation requirement: The page displays the current workspace name, current organization, current role, default configuration summary, and current context description; workspace is just the current context, not part of the overview pathname.

### Profile

- Figma: `profile`, node `10:14814`
- Screenshot: No corresponding screenshot at the moment; use Figma as the primary reference
- Product meaning: This is the current user's account profile and personal preferences page, belonging to `Identity / Account`, not the workspace settings page.
- Implementation requirement: The page should be organized around current user information, personal preferences, account-level security status, and account entry points; do not mix workspace configuration, subscription, or instance-level governance capabilities into the same page.

### Settings

- Figma: `settings`, node `11:3680`
- Screenshot: No corresponding screenshot at the moment; use Figma as the primary reference
- Product meaning: This is the workspace / organization settings page, belonging to `Organization / Workspace`, clearly separated from `profile`.
- Implementation requirement: logo/avatar, default currency, default rate, rounding, display strategy, and low-frequency workspace settings should all be entered from here; if billing / subscription needs to be displayed, it should also be presented as related information or a jump entry point, and the billing product surface should not be merged into this page as a whole.

## Web Requirements

The web side must completely carry the formal product capabilities defined in this volume; no formal capability defined in this volume is allowed to remain API-only.

Formal pages and entry points on the web side include:

- Account-level overview page
- Login / registration / preferences page
- User profile page
- Organization and workspace management page
- Workspace settings page
- logo / avatar management entry point
