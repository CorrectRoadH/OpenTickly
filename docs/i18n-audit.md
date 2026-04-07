# i18n Audit — Hardcoded English Strings

Generated: 2026-04-07

All TSX files under `apps/website/src/` with user-visible English strings not wrapped in `t()`.

## Legend

- ✅ = done
- ⬜ = todo

---

## Profile

- ✅ `features/profile/ApiTokenSection.tsx` — "API token", "Current token", "Rotate token", description text
- ✅ `features/profile/PreferencesFormSection.tsx` — "Preferences", all form labels, "Save preferences"
- ✅ `features/profile/ProfileFormSection.tsx` — "Account details", "Password update", all form labels, "Save profile"

## Session

- ✅ `features/session/WorkspaceSwitcher.tsx` — "New organization", "Manage", "Invite members", aria-labels

## Settings

- ✅ `features/settings/WorkspaceSettingsFormPrimitives.tsx` — "Replace", "Remove", "Upload your workspace logo", alt text
- ✅ `features/settings/SettingsCsvImport.tsx` — "CSV Import", column headers, "Go to CSV Import"

## Tracking

- ✅ `features/tracking/TimerComposerSuggestionsDialog.tsx` — "Change", "Favorites", "Previously tracked", "Projects", aria-labels
- ✅ `features/tracking/bulk-edit-pickers.tsx` — "Search by project…", "Create a new project", "No Project", "Current"
- ✅ `features/tracking/TimeEntryEditorDialog.tsx` — "Add a description", "Tags", "Billable hours", "Discard changes?", aria-labels, sr-only text

## Invoices

- ✅ `pages/invoices/InvoiceLineItems.tsx` — "Description", "Quantity", "Amount", "Total", placeholders
- ✅ `pages/invoices/InvoiceFormFields.tsx` — all form labels, placeholders
- ✅ `pages/invoices/InvoiceEditorPage.tsx` — "Invoice", "Connect QuickBooks", "Billed to:", "Pay to:", placeholders

## Goals

- ✅ `pages/goals/GoalTrackPicker.tsx` — "Search for projects…", "Select project", "Billable hours", placeholders
- ✅ `pages/goals/GoalsPage.tsx` — "No goals yet?"
- ✅ `pages/goals/GoalEditorDialog.tsx` — "Indefinite", "Goal name", "Search for members", aria-labels

## Reports

- ✅ `pages/shell/ReportsCharts.tsx` — "Duration by day", "Duration (h)"
- ✅ `pages/shell/ReportsBreakdownPanel.tsx` — "Duration", "Duration %"
- ✅ `pages/shell/ReportsDetailedView.tsx` — "Description", "Project", "Client", "Duration", "Start", "End", "Tags", "Billable"
- ✅ `pages/shell/ReportsCustomView.tsx` — "Show", "Find reports…", "Copy link", "Pin report", "More actions"
- ✅ `pages/shell/WorkspaceOverviewPage.tsx` — "Admin Overview", "This week summary", "Billable", "Non-billable", "Top projects this week"

## Clients

- ✅ `pages/clients/ClientDetailPage.tsx` — "Client details"
- ✅ `pages/clients/ClientsPage.tsx` — aria-labels, "Create new client"

## Groups

- ✅ `pages/groups/GroupsPage.tsx` — "Groups", "Teams", "Organization team directory", "No teams…"
- ✅ `pages/groups/GroupsSection.tsx` — "Loading…"

## Integrations / Approvals

- ✅ `pages/integrations/IntegrationsPage.tsx` — "Integrations", "Webhooks"
- ✅ `pages/approvals/ApprovalsPage.tsx` — "Approvals", "Timesheet Approvals"

## Members

- ✅ `pages/members/WorkspaceMembersPage.tsx` — "Members", aria-labels
- ✅ `pages/members/InviteMemberDialog.tsx` — placeholder text

## Mobile

- ✅ `pages/mobile/MobileTimeEntryEditor.tsx` — aria-labels, "Project"

## Profile Pages

- ✅ `pages/profile/ProfilePagePrimitives.tsx` — "Upload avatar", "Remove avatar"

## Projects

- ✅ `pages/projects/ProjectEditorDialog.tsx` — aria-labels, "Project name" placeholder
- ✅ `pages/projects/ProjectDetailPage.tsx` — "All members/teams", "Rate", "Cost", "Role", "Total hours", "Billable hours"
- ✅ `pages/projects/ProjectDetailLayout.tsx` — aria-label
- ✅ `pages/projects/ProjectRowActionsMenu.tsx` — "Edit project", "Add member", "View in reports"

## Settings Pages

- ✅ `pages/settings/WorkspaceSettingsPage.tsx` — "Section"
- ✅ `pages/settings/OrganizationSettingsPage.tsx` — "Section"

## Tags / Tasks

- ✅ `pages/tags/TagsPage.tsx` — "No tags…", "Create new tag"
- ✅ `pages/tasks/TasksPage.tsx` — "No tasks…"

## App Shell

- ✅ `app/SessionBootstrapStatus.tsx` — "Session ready", bootstrap description

---

**Total: 38 files** — all translated.
