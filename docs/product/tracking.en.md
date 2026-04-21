# Time Tracking

> Mission status
> Agent: global-running-timer-contract-and-regressions
> Status: complete
> Current code differences: Updated Edge Cases wording from "同一用户在同一 workspace 下" to "同一用户全局只能有一个 running timer（跨所有 workspace）" to reflect the mission-authoritative global per-user rule.
> Todo: none
> Fully implemented: yes

## Goal

This volume defines the user-visible behavior of time entry, running timer, projects/clients/tasks/tags, timesheets/approvals/expenses.

## Scope

This document defines:

- Time Entries
- running timer
- Projects / Clients / Tasks / Tags
- timesheets / approvals / expenses
- favorites / goals / reminders / timeline

Strict inputs for this document:

- `openapi/toggl-track-api-v9.swagger.json`
- The corresponding Figma timer / project / client / tag / tracking page prototypes

This document only supplements the functional details that OpenAPI and Figma cannot fully express.

## API Requirements

- tracking must not only provide the corresponding web pages, but must also fully implement the public interfaces of the tracking product surface in `Track API v9`.
- At least include:
  - time entries
  - running timer
  - projects
  - clients
  - tasks
  - tags
  - approvals
  - expenses
  - favorites
  - goals
  - reminders
- If a capability is treated as a formal tracking feature from a product standpoint, it cannot be implemented only as Web, without the corresponding public API.

## Product Rules

- tracking is the most frequently used product surface for daily use; API and Web must share the same set of public behaviors.
- The relationships among time entry, project, task, tag, billable, rate must maintain the same interpretation at creation, editing, stopping, bulk update, and report reading.
- running timer is not a UI feature, but a formal product state.
- favorites, goals, reminders, timeline — even with lower usage frequency — belong to the formal product surface and cannot be silently removed in the first version.

## Time Entries

- The time entry object needs to fully carry the publicly defined semantics of `workspace_id`, `user_id`, `project_id`, `task_id`, `client_id`, `description`, `billable`, `start`, `stop`, `duration`, `created_with`, `tags`, etc.
- Must fully support capabilities such as create, update, delete, single read, bulk read, bulk update, filtering by time range / user / project / task / tag / description, since incremental sync, stopping running time entries.
- `GET /me/time_entries`, `GET /me/time_entries/current`, `GET /me/time_entries/{time_entry_id}` belong to the public read model of the current account; the return boundary is the current user, and may return factual data of this account across multiple workspaces.
- When there is no running time entry, `GET /me/time_entries/current` returns `200` + body `null`; this is a formal product semantic, not an error state — clients should handle it accordingly and should not rely on a 404 response.
- `workspace_id` is still the formal field and write-ownership of each time entry; `POST /workspaces/{workspace_id}/time_entries`, `PATCH /workspaces/{workspace_id}/time_entries/{time_entry_id}/stop`, and other workspace routes are responsible for explicit write context.
- The Timer page family displays the projection of time entries under the current workspace context. The page may read data based on the `/me/time_entries` read model, but the final UI is only allowed to display entries with `workspace_id == current workspace`; time entries from other workspaces or other organizations must not appear in the current timer view.
- After the user switches the current workspace or organization, the three views `calendar`, `list`, `timesheet` must all immediately switch to the new workspace scope; the previous workspace's historical time entries must disappear from the current timer view.
- running timer must be implemented separately as formal product semantics, including start, stop, conflict handling, relationship between duration and start/end time, and reading of running state.
- Time semantics must be implemented according to the referenced public definitions for RFC3339-style input/output, UTC storage, user-timezone display, cross-day and cross-timezone behavior, and must provide a consistent factual source for report calibers.
- The running duration of the Web timer header must be displayed in real time based on the `start` time of the current running entry; do not directly render raw negative duration as elapsed seconds.
- The start and stop of the Web timer header are two different visible states and must use different icons; trailing overflow buttons not defined by the current Figma / screenshot must not be arbitrarily retained in the timer control area.

## Projects / Clients / Tasks / Tags

- The project object must carry publicly defined semantics such as `client_id`, `name`, `active`, `billable`, `private`, `color`, `currency`, `estimated_seconds`, `actual_seconds`, `fixed_fee`, `rate`, `pinned`.
- Must fully support capabilities such as create, view, update, delete, archive/restore, activate/deactivate, bulk modify, templates, pin/unpin, statistics and periods.
- Attributes such as `billable`, `private`, `rate`, `fixed_fee`, `currency`, `estimated_seconds` must have a consistent effect on default time-entry behavior, reports, and profitability analysis.
- Must fully support the association relationships of projects with client, tasks, project users, project groups, time entries, reports.

## Billable Rate Resolution

- The rate source related to billable amount must have a unique and cross-product-surface-consistent priority.
- The current default priority is defined as:
  - time entry explicit rate override
  - project rate
  - workspace member / user rate
  - workspace default rate
- When an upper-layer rate is `null` or not set, it must explicitly fall back to the next layer, rather than using different interpretations on different pages.
- Historical rate changes must not silently overwrite historical results that have already been approved, exported, shared, or settled.
- If subsequent public definitions prove that Toggl's public behavior is different, the updated public definition and the corresponding contract rules shall prevail.

## Timesheets / Approvals

- approvals must have a clear state machine, at least covering:
  - `pending`
  - `approved`
  - `rejected`
  - `reopened`
- The current default approval permission is workspace admin / owner; only when the public definition clearly proves that other public approver roles exist shall it be extended to other roles.
- `pending -> approved`, `pending -> rejected`, `approved -> reopened`, `rejected -> reopened` must be explicit state transitions.
- The current default rules are:
  - Regular members cannot directly modify approved data
  - If an operator with admin permission forcibly modifies, approval must return to `reopened`
- After an approver is disabled, they must not continue to produce new approval actions; their historical approval records are still preserved.

## Expenses

- expenses must have a clear state machine, at least covering:
  - `draft`
  - `submitted`
  - `approved`
  - `rejected`
  - `reimbursed`
- expense attachment must be defined as a formal product capability, not merely as an underlying file upload.
- The current default rule is that attachments are optional, unless subsequent public definitions clearly prove that Toggl requires an attached receipt under a specific policy.
- attachment must have explicit size, format, and count limits, and express them externally through public error semantics.
- expense must preserve the original currency and original amount; if there is a workspace display currency or a report conversion currency, the conversion rules must be explicit and auditable.
- If currency conversion occurs, the original amount, original currency, target conversion currency, and the exchange rate snapshot used must be preserved; historical expenses that are already approved or reimbursed must not be silently recomputed due to subsequent exchange rate changes.

## Edge Cases

- The same user can only have one running timer globally (across all workspaces); when a conflict occurs, there must be a fixed handling rule, rather than being decided independently by different entry points.
- When `start/stop/duration` of a time entry are inconsistently input, a fixed error must be returned, rather than making different automatic corrections at different entry points.
- State changes such as archived project or disabled member must not silently wipe out historical time entries.
- Fields like rate, billable, currency that affect reports and billing results must not have different interpretations on the tracking page and the reports page.

## Open Questions

- The precise public behavior of running timer concurrency conflicts still needs continued confirmation against Toggl public sources.
- The low-frequency fields and boundary behaviors of favorites, goals, reminders, timeline still need continued filling in from public sources.

## Page Mapping (Figma / Screenshot)

### Figma Prototype Reading Rules

- The Figma file referenced by this document is `https://www.figma.com/design/IiuYyZAD0bWx9C8BxetnFc/OpenToggl`.
- When reading tracking-related prototypes of this file, you must first build a page index using the top-level layer list in the `Layers` panel on the left of `Page 1`, and then enter the specific node; you cannot treat the truncated result returned by a single `get_metadata(nodeId=0:1)` on a large page as the real top-level structure.
- The current top-level layer list belonging to tracking within `Page 1` is:
  - `left nav`
  - `timer calendar mode`
  - `timer timesheet mode`
  - `project list`
  - `timer listview`
  - `client`
- This volume only records the page entry points owned by tracking; `profile`, `settings`, `integrations webhooks`, though also under the same Figma page, should be recorded in their respective PRDs and not expanded in this volume.
- When MCP / metadata returns incomplete content, the correct approach is to first confirm the top-level layer names via the Figma `Layers` panel, and then read the target page using the node ids recorded in this document and other PRDs; you cannot infer from one truncated response that a page prototype does not exist.

### Figma MCP Call Order

- When you only want to confirm how many pages this Figma file has, call `get_metadata(nodeId="0:0")` and read the `canvas` list from the direct children of `document`.
- When you want to confirm the top-level layers of `Page 1`, do not only rely on the long response of `get_metadata(nodeId="0:1")`; first confirm the top-level layer names in the Figma `Layers` panel, and then record the results in the PRD.
- When you want to read the structure of a known page prototype, call `get_metadata(nodeId="<node-id>")` directly against the node id recorded in this document, for example:
  - `get_metadata(nodeId="8:3029")` reads `timer calendar mode`
  - `get_metadata(nodeId="12:2948")` reads `timer listview`
  - `get_metadata(nodeId="10:13202")` reads `timer timesheet mode`
- When you want to implement or verify concrete visuals and interactions, you cannot stop at metadata; you must continue to call `get_design_context(nodeId="<node-id>")` to obtain the design context of that page or component.
- If you need screenshot evidence or visual comparison, then call `get_screenshot(nodeId="<node-id>")`; screenshots are used for visual proofing and do not replace the page semantics and boundary definitions recorded in this document.
- If `get_metadata` returns truncated content, omits sibling hierarchies, or is difficult to reliably enumerate top-level layers, then use the Figma `Layers` panel as the source of the top-level index, and use the node ids recorded in this document as subsequent MCP precise read entry points.

### Choose MCP Entry by Target Page

- First select the PRD by product boundary, then call MCP by the node id recorded in that PRD; do not first scan the entire Figma page and then temporarily guess which page should belong to whom.
- When the shared navigation shell is needed, call `left nav`, node `8:2829`. This applies to the workspace switcher, side navigation, profile/admin entry points, and shell layout shared by tracking-related pages.
- When `Timer / Calendar` is needed, call `timer calendar mode`, node `8:3029`.
- When `Timer / List view` is needed, call `timer listview`, node `12:2948`.
- When `Timer / Timesheet` is needed, call `timer timesheet mode`, node `10:13202`.
- When `Project page` is needed, call `project list`, node `10:20028`. Even if the subsequent implementation includes details, members, tasks, or template entry points, use this page skeleton as the MCP entry point first.
- When `Client page` is needed, call `client`, node `12:3281`.
- When `Tag page` or `Task page` is needed, there is currently no independent tracking Figma node; according to the definitions in this document, reuse the skeleton of `project page` as fallback, rather than guessing another approximate page from `Page 1`.
- If you only have the user's verbal description, such as "timer page", "project page", "client page", first merge the requirement into the page-family name in this document and then call the corresponding node; do not run full metadata on `Page 1` and then rely on text search to replace page mapping.
- If this document already provides a node id, call `get_metadata` / `get_design_context` / `get_screenshot` directly against that node; the top-level layer list of `Page 1` is only used to establish an index, not as the default read entry point.

### Shared App Shell

- The shared app shell refers to the Figma `left nav` node `8:2829`; the file is `https://www.figma.com/design/IiuYyZAD0bWx9C8BxetnFc/OpenToggl`.
- The workspace switcher, left-side navigation, and profile/admin entry points should reuse the same shell across `overview`, `timer`, `project`, `client`, `tag`, rather than copying a set of layouts for each page.
- The formal top-level entry points under the `Track` group are `Overview` and `Timer`; do not turn the timer state into a pseudo-navigation card to replace the formal `Timer` nav item.

### Upstream URLs and Navigation Ownership

- This volume records the formal page semantics of the tracking product surface, but navigation active state, routing ownership, and ID ownership must also be verified against the real URL shape of upstream Toggl, and cannot be matched by prefix only because it "looks like a workspace sub-route".
- `workspace_id` and `organization_id` must be strictly distinguished; just because both IDs appear in the left-side shell, they cannot be conflated into the same routing rule.
- The upstream entry point of `overview` is `https://track.toggl.com/overview`.
- The upstream entry point of the `timer` page family is `https://track.toggl.com/timer`.
- Both `overview` and `timer` are account-level page entry points, not entered via `workspace_id`; the current workspace is only the page context, not a component of these two pages' pathnames.
- The three views `calendar`, `list`, `timesheet` of `timer` are local state switches within the same page in upstream Toggl, not distinguished by URL pathname or query string; the address bar does not change when switching views.
- When entering `https://track.toggl.com/timer` directly, the default active view is `calendar`; `list` and `timesheet` are only switches of the main content projection within the same page.
- The upstream path of `reports summary` is `https://track.toggl.com/reports/{organization_id}/summary?...&wid={workspace_id}`. It belongs to the reports product surface, not the tracking page family, but the shared shell's navigation judgment needs to recognize that it carries both organization and workspace context.
- The upstream path of `approvals` is `https://track.toggl.com/{workspace_id}/approvals`.
- The upstream path of `projects` is `https://track.toggl.com/projects/{workspace_id}/list`.
- The upstream path of `clients` is `https://track.toggl.com/{workspace_id}/clients`.
- The upstream path of `tags` is `https://track.toggl.com/{workspace_id}/tags`.
- The upstream path of organization-level team management is `https://track.toggl.com/organization/{organization_id}/team?filter=&status=active`. This is an organization page and should not be treated as a workspace tracking page.
- The organization / workspace settings entry point cross-domains to `accounts.toggl.com`; the currently known organization entry shape is `https://accounts.toggl.com/console/organization/{organization_id}/overview/?returnTo=<track-workspace-settings-url>`, where `returnTo` returns to `https://track.toggl.com/{workspace_id}/settings/general`. This shows that settings/organization console is not an in-domain sub-route of the tracking page family.
- Any shared shell or navigation highlight implementation must determine the currently selected item by "page ownership + exact path shape + ID type", and cannot collapse `/overview`, `/timer`, `/reports/{organization_id}/summary`, `/{workspace_id}/approvals`, `/projects/{workspace_id}/list`, `/organization/{organization_id}/team` into the same workspace sub-path.

### Timer Page Family

- `Timer / Calendar`
  - Figma: `timer calendar mode`, node `8:3029`
  - Screenshot: [toggl-timer-calendar-view-week.png](../../toggl_screenshots/toggl-timer-calendar-view-week.png)
  - Product meaning: This is the weekly view of the same `timer` page under the `calendar` view, displaying time entries in a time grid.
  - Implementation requirement: It shares the same page family, date range, filter conditions, running timer/header state with `list view` and `timesheet`, only replacing the main content projection, without separately defining another page or data model; `calendar` is also the default landing view when the user directly opens `timer`.
  - URL constraint: In upstream Toggl, `calendar` is not a separate URL; it is view state inside `https://track.toggl.com/timer`.
  - Data boundary: What the page displays are the time entries of the current workspace; even if the underlying read comes from `/me/time_entries`, it must be filtered by the current workspace before entering the `calendar` projection.
- `Timer / List view`
  - Figma: `timer listview`, node `12:2948`
  - Screenshot: [toggl-timer-list-view-all-dates.png](../../toggl_screenshots/toggl-timer-list-view-all-dates.png)
  - Product meaning: This is the detailed view of the `timer` page grouped by date, displaying time entries in a linear list.
  - Implementation requirement: What it reads is still the same batch of current-workspace time entries; it should not produce different filter semantics from `calendar` and `timesheet`; the entry points for creating, editing, and stopping the timer should remain consistent.
  - URL constraint: In upstream Toggl, `list` is not a separate URL; it is view state inside `https://track.toggl.com/timer`.
- `Timer / Timesheet`
  - Figma: `timer timesheet mode`, node `10:13202`
  - Screenshot: [toggl-timer-timesheet-view-week.png](../../toggl_screenshots/toggl-timer-timesheet-view-week.png)
  - Product meaning: This is the aggregated presentation of the `timer` page under the `timesheet` view, displaying work duration along the project and weekday dimensions.
  - Implementation requirement: It is the aggregated read surface of current-workspace time entries, not a separate transactional write model; behaviors such as copying last week, daily totals, and per-project row display should all be built on the same tracking facts.
  - URL constraint: In upstream Toggl, `timesheet` is not a separate URL; it is view state inside `https://track.toggl.com/timer`.

### Project / Client / Tag Pages

- `Project page`
  - Figma: node name `project list`, node `10:20028`
  - Screenshot: [toggl-projects-list.png](../../toggl_screenshots/toggl-projects-list.png)
  - Product meaning: Interpreted as `project page` in the PRD, not merely a read-only list. It bears project browsing, filtering, creation, archiving/restoring, pin/unpin, and member and task entry points.
  - Implementation requirement: The top filter bar, main table, create button, columns such as time status/members/pinned are the default information architecture; detail, member, task, template, and other flows should enter or hook from this page, rather than being split into a group of unrelated pages.
  - URL constraint: The upstream Toggl entry path is `https://track.toggl.com/projects/{workspace_id}/list`, not a simple workspace sub-path like `/{workspace_id}/projects`.
- `Client page`
  - Figma: `client`, node `12:3281`
  - Screenshot: No corresponding screenshot at the moment; use Figma as the primary reference
  - Product meaning: client is an independent product object, not a subsidiary tag of project.
  - Implementation requirement: The filter bar, table skeleton, bulk operations, and detail entry directly reference the `project page` structure, only replacing the main entity, column definitions, and filter conditions with client semantics.
  - URL constraint: The upstream Toggl entry path is `https://track.toggl.com/{workspace_id}/clients`.
- `Tag page`
  - Figma: Currently no standalone node
  - Screenshot: Currently no standalone screenshot
  - Product meaning: tag is still a formal product object, but the current page structure can directly reference `project page`.
  - Implementation requirement: The information architecture, filter bar, table body, bulk editing, and detail entry can follow the skeleton of `project page`, only replacing it with tag fields and operations; if a standalone Figma node is later added, the visual and interaction differences will be refined then.
  - URL constraint: The upstream Toggl entry path is `https://track.toggl.com/{workspace_id}/tags`.

## Web Requirements

The web side must completely carry the formal capabilities of the tracking product surface; it is not allowed to keep the formal capabilities defined in this volume as API-only.

Formal pages and entry points on the web side include:

- Time entry list and timer entry point
- Create / edit form
- Bulk edit and filter view
- Project list, detail, member management, task management, template view
- timesheets / approvals / expenses pages
