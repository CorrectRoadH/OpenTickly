# BDD User Stories For Testing

This document organizes the high-value user stories from the product docs into BDD-style acceptance scenarios, used as the entry point for designing page flow, e2e, integration, contract, and regression tests.

Constraints:

- Only describe user-observable behavior; no API paths, HTTP methods, or implementation details.
- A large story expresses a user goal.
- Each `Given / When / Then` scenario expresses one happy path, failure branch, or edge case.
- Which test layer takes it on is decided at implementation time.

## Tracking

### Story 1: User manages a running timer

As a workspace user, I want to start, view, and stop a timer so that I can continuously record working time and see consistent results across different official views.

- Given the user currently has no running timer
  When the user starts a new timer
  Then the system shows the timer as running

- Given the user already has a running timer
  When the user starts another new timer
  Then the system handles it via fixed conflict rules
  And different entrypoints give a consistent result for the same conflict

- Given the user has already started a timer
  When the user switches between `calendar`, `list`, and `timesheet`
  Then every view shows the same running timer

- Given the user navigates directly to the `timer` page
  When the page finishes loading for the first time
  Then it defaults to showing the `calendar` view

- Given the user has a running timer
  When the user stops the timer
  Then the system produces an official time entry

- Given the time data submitted by the user is internally inconsistent
  When the user tries to save
  Then the system rejects the operation
  And does not silently correct the data

- Given a historical time entry is associated with an archived project or a deactivated member
  When the user views the history
  Then the historical record is still visible

### Story 2: User creates and modifies time entries

As a workspace user, I want to create and modify time entries so that I can accurately record project, task, tag, and billing information and get consistent results across different read views.

- Given the user has filled in the primary fields of a time entry
  When the user saves the entry
  Then the system saves the entry and shows consistent results across the main views

- Given the user modifies an existing time entry
  When the modification saves successfully
  Then later reads reflect the latest modification

- Given a time entry contains fields like `billable`, `rate`, or `currency` that affect interpretation of results
  When the user views the entry in tracking or reports
  Then the system interprets these fields consistently

- Given the user submits an invalid time range
  When the user tries to save
  Then the system rejects the operation

- Given some associated objects later change state
  When the user views historical time entries
  Then the system does not silently rewrite the historical fact

### Story 3: Admin handles approval state

As a workspace admin, I want to handle pending approvals so that I can control the approval state and keep the approval history intact.

- Given an approval record is in `pending`
  When the admin approves the record
  Then the state becomes `approved`

- Given an approval record is in `pending`
  When the admin rejects the record
  Then the state becomes `rejected`

- Given an approval record is already `approved` or `rejected`
  When the admin reopens it per the rules
  Then the state becomes `reopened`

- Given an ordinary member tries to modify already-approved data
  When the modification is submitted
  Then the system rejects the operation

- Given an admin forcibly modifies already-approved data
  When the modification takes effect
  Then the approval state returns to `reopened`

- Given some approver has been deactivated
  When the user views the approval history
  Then historical approval records are still visible
  And that approver can no longer produce new approval actions

### Story 3A: Admin manages projects, clients, tasks, and tags directory objects

As a workspace admin or member with corresponding permissions, I want to manage projects, clients, tasks, and tags, so that tracking, reports, and member authorization all work on the same directory truth.

- Given the user enters the `project page`
  When the user browses projects by status, archive, or pinned dimensions
  Then the system returns consistent list results based on the same directory truth

- Given the user creates or modifies a project, client, task, or tag
  When the save is successful
  Then the object remains visible consistently in the corresponding directory page, related pickers, and subsequent tracking entrypoints

- Given the user archives, restores, pins, or unpins a project
  When the state change takes effect
  Then the directory page, detail entrypoint, and subsequent available scope update under the same rules

- Given a task or tag is accessed via the project page or another official entrypoint
  When the user switches between entrypoints
  Then the system preserves the same object ownership, filter conditions, and detail-entry semantics

- Given the user lacks management permissions for the corresponding directory object
  When the user tries to create, modify, or batch-operate
  Then the system rejects the operation
  And does not rely on hiding buttons to substitute for a formal permission result

## Identity And Workspace

### Story 4: User logs in and enters the correct workspace

As a logged-in user, I want to enter the system and see the correct workspace and account context, so that I can continue working without having to re-establish state.

- Given the user has successfully logged in
  When the user enters the application
  Then the system shows the current user info and the current workspace context

- Given the user is logged in and within a workspace
  When the user refreshes the page
  Then the system restores the same session and the same workspace context

- Given the user is not logged in or the session has expired
  When the user accesses a page requiring identity
  Then the system directs the user to the login flow

- Given the user is deactivated
  When deactivation takes effect
  Then the user cannot continue to log in or modify business objects
  And their historical business facts remain

- Given the user has a running timer when deactivation occurs
  When deactivation takes effect
  Then the system automatically stops that timer
  And the timer does not auto-resume when the user is reinstated

### Story 4A: User manages account profile, personal preferences, and API token

As a logged-in user, I want to manage my own account profile, personal preferences, and API token, so that I can control account-level identity and personal working style without mixing these settings into workspace configuration.

- Given the user enters `profile`
  When the page finishes loading
  Then the system shows the current user profile, personal preferences, and account-level security entrypoints

- Given the user modifies their name, email, timezone, or other account profile
  When save succeeds
  Then the profile read later is consistent with what session bootstrap shows

- Given the user modifies date format, first day of week, or other personal preferences
  When save succeeds
  Then these preferences take effect with account-level semantics in subsequent official entrypoints

- Given the user resets the API token
  When reset completes
  Then the old token can no longer be used
  And the new token can be used as an official account credential

- Given the user submits invalid or protected account fields
  When the user tries to save
  Then the system returns an explicit rejection
  And does not silently ignore or rewrite these fields

### Story 4B: User actively logs out and ends the current session

As a logged-in user, I want to actively log out of the current session, so that I can safely end access and ensure subsequent protected pages no longer use the old session.

- Given the user is currently logged in
  When the user actively performs logout
  Then the current session is officially invalidated

- Given the user has already logged out
  When the user again accesses a page requiring identity
  Then the system directs the user back to the login flow

- Given the user holds front-end state tied to the current session across multiple pages or entrypoints
  When logout succeeds
  Then visible state related to the current session is uniformly cleared
  And the old user context is no longer shown

### Story 5A: Admin manages organization, workspace, and current work context

As an organization or workspace admin, I want to manage organizations, workspaces, and their current context, so that I can maintain multiple business containers in the same instance and ensure users enter the correct work scope.

- Given the admin creates an organization or workspace
  When creation succeeds
  Then the new object appears in the official entrypoints
  And its parent-child relationship stays correct

- Given the admin modifies an organization or workspace's public information
  When save succeeds
  Then the name, branding, and context displayed on subsequent reads are consistently updated

- Given the user has access to multiple workspaces
  When the user switches the current workspace
  Then the system switches all subsequent pages and entrypoints to the same work context

- Given a workspace or organization is deactivated or deleted
  When the user later views the current context or historical business facts
  Then the system handles the current access ability per fixed rules
  And does not silently erase historical business facts

### Story 5: Admin manages workspace settings

As a workspace admin, I want to modify workspace settings, so that I can control default currency, default rate, display, and branding configuration, and have these settings affect formal product behavior.

- Given the admin enters the workspace settings page
  When modifying default currency, default rate, rounding, or display policy
  Then the system saves these settings and they take effect in related product behavior

- Given workspace settings affect tracking and reports
  When the user later views time entries or reports
  Then the system interprets these results based on the new public settings

- Given the admin modifies logo, avatar, or branding assets
  When save succeeds
  Then the workspace shows the updated brand info in official entrypoints

- Given a non-admin tries to modify workspace settings
  When the change is submitted
  Then the system rejects the operation

- Given a workspace or organization is deactivated or deleted
  When the user views historical business facts
  Then historical business facts do not silently vanish from reports because of the container's state change

## Membership And Access

### Story 6: Admin manages the member lifecycle

As an admin, I want to invite, remove, disable, and restore members, so that I can control who can continue accessing the workspace and its resources.

- Given the admin invites a new member
  When the invitation is sent
  Then the member enters the invited state

- Given an invited member completes joining
  When joining succeeds
  Then the member enters the joined state and obtains the corresponding role capabilities

- Given the admin disables a member
  When disabling takes effect
  Then the member cannot produce new business changes
  And their historical business facts remain

- Given the admin restores a previously disabled member
  When restoration takes effect
  Then the member regains the access capabilities they should currently have
  And the running state that was terminated by the system before disabling does not auto-resume

- Given the admin removes a member
  When removal takes effect
  Then the member loses subsequent access
  And historical time entries and audit results remain

### Story 6A: Admin manages member rates and cost settings

As an admin, I want to manage member rates and cost settings, so that billable, cost, and profitability results are all computed based on the same member truth.

- Given the admin sets a rate or cost for a member
  When save succeeds
  Then subsequent tracking, reports, and profitability results are interpreted per that setting

- Given member rate or cost changes
  When the user views newly produced data
  Then the new results use the currently effective setting
  And already-fixed historical results are not silently rewritten

- Given a non-admin tries to modify member rate or cost
  When the change is submitted
  Then the system rejects the operation

### Story 7: Member permissions affect visibility of private projects, reports, and events

As a member or admin in the system, I want permission changes to consistently affect the exposure of projects, time entries, reports, and events, so that different entrypoints do not produce contradictory visibility.

- Given a member has access to a private project
  When that member views the project, creates a time entry, or views related results
  Then the system allows them to operate and view within the authorized scope

- Given a member loses access to a private project
  When that member reads related content again
  Then the system trims their visible scope based on current permissions

- Given a member once produced historical time entries on that private project
  When they later lose access
  Then the historical ownership fact remains unchanged
  And subsequent visible scope is re-trimmed based on current permissions

- Given the three-level relationships among organization members, workspace members, and project members conflict
  When the system decides the final permission
  Then the narrower business-scope rule takes precedence

- Given member rate and cost settings have taken effect
  When the user views `billable`, `cost`, or `profitability` results
  Then the system gives a consistent interpretation based on the same member truth

### Story 7A: Admin manages groups and member membership

As a workspace admin, I want to manage groups and their member memberships, so that I can use official group semantics to drive project authorization, visibility, and subsequent bulk management, rather than relying on ad-hoc list maintenance.

- Given the admin enters the group management page
  When the page finishes loading
  Then the system shows groups and their state under the current workspace

- Given the admin creates, modifies, disables, or restores a group
  When the change takes effect
  Then the group is visible with a consistent state in the official entrypoints

- Given the admin adjusts the member membership of some group
  When save succeeds
  Then subsequent project authorization, visible scope, and group management pages are all based on the same group truth

- Given a group has been disabled or no longer holds authorization
  When the user views related projects, members, or historical results
  Then the system handles subsequent access ability per fixed rules
  And does not silently rewrite historical facts

- Given a non-admin tries to manage groups or group membership
  When the change is submitted
  Then the system rejects the operation

### Story 7B: Admin configures workspace permission policies

As a workspace admin, I want to configure workspace permission policies, so that project creation, tag creation, team visibility, and public data scope all run consistently under the official policy.

- Given the admin enters the permission configuration page
  When the page finishes loading
  Then the system shows the current workspace's permission policies and their current values

- Given the admin modifies policies such as "only admins can create projects/tags" or "only admins can see the team panel"
  When save succeeds
  Then subsequent related entrypoints show consistent results per the new policy

- Given the admin modifies public project data scope or similar visibility policies
  When the change takes effect
  Then members see consistent permission results across directory pages, tracking, reports, and other entrypoints

- Given a non-admin tries to modify workspace permission policies
  When the change is submitted
  Then the system rejects the operation

- Given a policy has already affected formal product behavior
  When the user later uses affected entrypoints
  Then the system does not show a conflict state of "page copy says one thing, actual permission says another"

## Reports And Sharing

### Story 8: User views, saves, and shares reports

As a user, I want to view, save, and share reports online, so that I can reuse query definitions and provide the same results to others in different ways.

- Given the user has configured a set of report filters
  When the user views the results online
  Then the system returns an official report result per these filters

- Given the user has saved a report
  When they open it again later
  Then the system restores that report per its saved definition

- Given the user has shared a report
  When others view it via the shared entrypoint
  Then the system provides results per the permission and parameter semantics of that shared object

- Given the user exports a report
  When the export completes
  Then the exported result expresses the same set of statistical facts as the online query
  And does not switch to different semantics because of the export

- Given a `shared report`, `saved report`, and online query reference the same set of parameters
  When the user views each of these results
  Then they stay consistent in permission and parameter interpretation

### Story 8A: User keeps the same query semantics across different reports read views

As a user, I want to keep the same query semantics when switching among `detailed`, `summary`, `weekly`, `trends`, `profitability`, and `insights`, so that different report perspectives do not become mutually contradictory statistical systems.

- Given the user has configured a set of filters
  When the user switches between different reports read views
  Then each read view shares the same parameter semantics

- Given some statistics are affected by timezone, rounding, rate, or currency
  When the user views different reports read views respectively
  Then the system gives a consistent interpretation of these statistical definitions

- Given the user enters export, save, or share from some reports read view
  When they later re-view the results
  Then these entrypoints still express the same query facts

### Story 8B: User exports a report and reuses the same query definition

As a user, I want to export the current report as CSV, PDF, or XLSX, so that I can reuse the online query definition rather than obtaining an offline result with different semantics.

- Given the user is currently viewing a report
  When the user exports CSV, PDF, or XLSX
  Then the exported result follows the current query definition and permission scope

- Given the same report can be viewed online, saved, shared, and exported
  When the user uses these entrypoints respectively
  Then the system does not switch to different semantics on parameter interpretation, permission, or statistical definition

### Story 9: Reports preserve historical facts after historical objects change

As a user, I want reports to stably express historical business facts, so that when objects are deactivated, deleted, or archived, historical results are not silently erased.

- Given some projects, members, or other business objects are later deactivated, deleted, or archived
  When the user views historical reports
  Then the reports continue to tally these historical facts

- Given the user views a data range that contains historical objects
  When the report produces results
  Then the system does not directly delete the corresponding historical data just because the object is currently deactivated

- Given the owner of a shared report becomes deactivated
  When other users continue to access that shared object
  Then the system handles the shared object's availability per fixed rules
  And does not produce an ambiguous intermediate state

## Importing

### Story 10: User imports Toggl data

As a user migrating to OpenToggl, I want to import exported Toggl data, so that I can continue using my existing data, reference relationships, and main views.

- Given the user has uploaded a valid export sample
  When the import completes
  Then the system gives clear success feedback

- Given during the import some data succeeds and some fails
  When the import ends
  Then the system clearly distinguishes success and failure results
  And the user can understand the failure reasons

- Given the import process discovers conflicts or duplicate data
  When the import continues
  Then the system handles conflicts per fixed rules
  And shows the conflict results to the user

- Given the import fails but the issue is recoverable
  When the user triggers the import again
  Then the system allows retry
  And the user can see diagnostic information

- Given the import succeeds
  When the user enters the main tracking or reports views
  Then the imported data can be read normally

### Story 10A: User views import task status, diagnostic info, and retries

As a user performing migration, I want to view import task status, failure details, and diagnostic info, and retry when recoverable, so that I can manage the import process as a formal product flow rather than relying on backend scripts to guess results.

- Given the user has started an import task
  When the user views the import task list or detail
  Then the system shows that task's current status, progress, and result summary

- Given the import task has partial failures or conflicts
  When the user views the diagnostics page
  Then the system clearly shows failed objects, conflict types, and understandable reasons

- Given some failure is a recoverable issue
  When the user chooses retry
  Then the system re-processes per the official flow
  And the user can distinguish the new execution result from the previous failure result

## Webhooks

### Story 11: Admin manages Webhook subscriptions

As a workspace admin, I want to create, validate, and maintain webhook subscriptions, so that I can stably receive workspace events and know whether subscriptions are currently healthy.

- Given the admin is creating a new subscription
  When the admin completes creation
  Then the system saves the subscription and includes it in the workspace's manageable objects

- Given a subscription already exists
  When the admin performs validation or ping
  Then the system returns a result distinguishable from real delivery
  And the admin can tell whether this result came from manual validation or actual event delivery

- Given a subscription's target endpoint is temporarily unavailable
  When the system attempts to deliver events
  Then the system records failure per fixed rules
  And the admin can see the failure history

- Given a subscription keeps failing
  When the failures reach a system-defined threshold
  Then the system disables or marks the subscription as abnormal per fixed rules

- Given a subscription was originally permitted to see some event class
  When the subscription owner, workspace permissions, or private project visibility changes
  Then the subscription's subsequent visible event scope changes accordingly
  And events are no longer exposed per old permissions

- Given the workspace hits a related limit
  When the admin continues to create or use subscriptions
  Then the system gives an explicit limit result
  And does not use silent failure as a substitute for formal feedback

### Story 12: Admin views and controls subscription health

As a workspace admin, I want to view subscription status, failed attempts, and health diagnostics, so that I can judge whether a subscription is still safe to use.

- Given multiple subscriptions exist in the workspace
  When the admin enters the subscription list or status page
  Then each subscription shows its current state and visible health info

- Given some subscription has recently had multiple failures
  When the admin views its history
  Then the system shows recent failed attempts and result trends

- Given some subscription has been disabled
  When the admin views the subscription
  Then the system clearly shows it as disabled
  And does not display it as normally running

- Given the admin has fixed the subscription configuration or target endpoint
  When the admin re-enables or re-validates the subscription
  Then the system re-includes it in health-state judgments per the official flow

## Billing And Subscription

### Story 13: Admin manages plans, subscriptions, and quotas

As an organization or workspace admin, I want to view the current plan, subscription status, and quota usage, so that I know what capabilities are currently available and whether we are near a limit.

- Given the admin enters the billing or subscription page
  When the page finishes loading
  Then the system shows the current plan, subscription status, and related quota information

- Given some capability is restricted by the plan
  When the user tries to use that capability
  Then the system rejects or limits the action per uniform rules
  And does not produce mutually conflicting results across different product surfaces

- Given organization and workspace both show subscription-related information
  When the admin views both perspectives
  Then they express the same commercial fact
  And do not form two mutually conflicting truths

- Given the plan is upgraded or downgraded
  When the change takes effect
  Then the system updates capability exposure and quota state
  And existing historical business facts are not silently deleted

- Given the user is near or at the quota cap
  When the user continues to create restricted objects or perform restricted actions
  Then the system gives explicit limit feedback
  And the user can still view existing historical objects

### Story 13A: Admin manages customer, invoice, and payment-related state

As an organization or workspace admin, I want to view customer, invoice, and payment-related state, so that I can understand the current commercial relationship and billing state without switching to another external management system to interpret product behavior.

- Given the admin enters the official billing or subscription page
  When the page finishes loading
  Then the system shows public state related to customer, invoice, and payment

- Given an invoice is in pending, paid, failed, or other formal state
  When the admin views billing records
  Then the system clearly shows that state
  And does not conflate it with general subscription copy

- Given customer or payment state changes
  When the change takes effect
  Then subsequent billing, quota, and feature exposure entrypoints see the consistent commercial fact

### Story 14: Admin handles over-limit state after a downgrade

As an admin, I want to know how over-limit objects are handled after a plan downgrade, so that I can continue managing existing data without having the system silently lose historical facts.

- Given the workspace or organization undergoes a plan downgrade
  When there are over-limit objects after the downgrade takes effect
  Then the system handles these objects per fixed rules

- Given some objects already existed before the downgrade
  When the downgrade completes
  Then these historical objects are not silently deleted by the system

- Given some new action is no longer allowed after the downgrade
  When the user continues to attempt that action
  Then the system explicitly rejects the action
  And the rejection result is consistent with the current plan state

- Given the admin views the limit or plan page
  When the page shows the current state
  Then the admin can understand which capabilities are still available, which are restricted, and which objects are historical over-limit objects

## Instance Admin And Platform Operations

### Story 15: Site owner completes the first-admin bootstrap

As a self-hosted site owner, I want the instance, on its first startup, to create the first admin account, so that I can officially take over the entire site without relying on database or command-line back doors.

- Given the instance has not yet been bootstrapped
  When the site owner enters the first-admin creation flow and submits valid info
  Then the system creates the first admin and marks the instance as bootstrapped

- Given the instance has already been bootstrapped
  When a user tries to run the first-admin creation flow again
  Then the system explicitly blocks repeating the bootstrap
  And does not silently overwrite the existing admin

### Story 16: Site owner manages registration policies and instance-level user governance

As a site owner or platform admin, I want to manage registration policies and instance-level user state, so that I can control who enters the instance and how to handle abuse, compliance, or security events.

- Given the admin modifies open registration, closed registration, or invite-only registration policies
  When the change takes effect
  Then subsequent registration entrypoints show consistent results per the new instance policy

- Given the admin views the instance-level user list
  When the page finishes loading
  Then the system shows instance-level governance info such as user state, search filters, and high-privilege markers

- Given the admin disables or restores some instance-level user
  When the change takes effect
  Then the user's subsequent access ability changes per official instance-level rules

### Story 17: Site owner manages instance-level configuration and provider state

As a site owner, I want to manage instance-level configuration for SMTP, storage, payment, SSO, and the like, so that the whole site can operate via formal product entrypoints without relying on environment variables and manual troubleshooting.

- Given the admin enters the instance-level configuration page
  When the page finishes loading
  Then the system shows instance-level providers and key configuration state

- Given the admin modifies instance-level configuration like SMTP, storage, payment, or SSO
  When save succeeds
  Then related product capabilities run based on the new instance-level configuration

- Given some provider config is missing, invalid, or in an abnormal state
  When the admin views the config or diagnostics entrypoint
  Then the system gives formally visible state and diagnostic info

### Story 18: Site owner views instance health, maintenance state, and audit records

As a site owner or platform admin, I want to view instance health, background task state, maintenance mode, and audit records, so that I can maintain the service without directly operating underlying infrastructure.

- Given the admin enters the instance health or diagnostics entrypoint
  When the page finishes loading
  Then the system shows instance health, background job state, key stats, and async system state

- Given the admin enables maintenance mode, read-only mode, or pauses background tasks
  When the state switch succeeds
  Then the system explicitly expresses the current maintenance state in official entrypoints

- Given the admin has performed a high-privilege operation or config change
  When the user views the audit entrypoint
  Then the system can look up the corresponding audit record
  And does not leave these changes only in the underlying logs

## Coverage Mapping

The following mappings implement the two mappings required by `docs/core/testing-strategy.md`:

- `BDD Story -> Test Coverage`
- `PRD -> Figma node or fallback -> page implementation -> page flow/e2e`

Status definitions:

- `Covered`: a primary test evidence chain directly corresponding to the story or page currently exists.
- `Partially covered`: partial evidence exists, but not yet a complete acceptance chain as required by testing-strategy.
- `Missing`: no formal test evidence in the repo yet that directly takes on this story or page.
- `Approved deferral`: not directly closed in this plan at this stage; owned by a downstream plan with an explicit owner; the gap must remain visible until closed.

### BDD Story -> Test Coverage

| Story                                                          | Product source                             | Domain / Unit                                                                                                                                                                                                                                            | Application Integration                                                                                                                            | Contract / Golden                                                                                                         | Frontend Feature / Page Flow                                                                                                                                                                                                                                                       | E2E / Real Runtime                                                                      | Current status | Main gap                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Story 1: User manages a running timer                                  | `docs/product/tracking.md`                 | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | `apps/website/e2e/timer-page.real-runtime.spec.ts`                                      | Partially covered | Timer start/stop real-runtime chain has been added, but a fuller acceptance chain for the timer page flow, running timer contract, and time entry generated after stop is still not established |
| Story 2: User creates and modifies time entries                                | `docs/product/tracking.md`                 | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | No regressable evidence yet for time entry create/edit/filter/billable/rate consistency                                                                |
| Story 3: Admin handles approval state                                    | `docs/product/tracking.md`                 | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Approvals state machine, permission rejection, and reopened semantics not yet in the test baseline                                                                         |
| Story 3A: Admin manages projects, clients, tasks, and tags directory objects | `docs/product/tracking.md`                 | `apps/backend/internal/catalog/domain/project_test.go`, `apps/backend/internal/catalog/domain/project_access_test.go`                                                                                                                                    | `apps/backend/internal/catalog/application/catalog_objects_test.go`                                                                                | Missing                                                                                                                      | `apps/website/src/pages/projects/__tests__/projects-page-flow.test.tsx`, `apps/website/src/pages/clients/__tests__/clients-page-flow.test.tsx`, `apps/website/src/pages/tasks/__tests__/tasks-page-flow.test.tsx`, `apps/website/src/pages/tags/__tests__/tags-page-flow.test.tsx` | Missing                                                                                    | Partially covered | Page flow and partial catalog backend rules exist, but contract, e2e, and more complete directory-object lifecycle coverage are missing                               |
| Story 4: User logs in and enters the correct workspace                            | `docs/product/identity-and-tenant.md`      | `apps/backend/internal/identity/domain/user_test.go`                                                                                                                                                                                                     | `apps/backend/internal/identity/application/identity_sessions_test.go`                                                                             | `apps/backend/internal/http/web_routes_test.go`, `apps/backend/internal/identity/transport/http/web/handler_test.go`      | `apps/website/src/pages/auth/__tests__/auth-page-flow.test.tsx`, `apps/website/src/pages/shell/__tests__/workspace-shell-page-flow.test.tsx`                                                                                                                                       | `apps/website/e2e/app-shell.spec.ts`, `apps/website/e2e/app-shell.real-runtime.spec.ts` | Covered   | The formal logout chain has not yet been separately covered by this story's page flow / real-runtime evidence                                                               |
| Story 4A: User manages account profile, personal preferences, and API token               | `docs/product/identity-and-tenant.md`      | `apps/backend/internal/identity/domain/user_test.go`                                                                                                                                                                                                     | `apps/backend/internal/identity/application/identity_sessions_test.go`                                                                             | `apps/backend/internal/http/web_routes_test.go`, `apps/backend/internal/identity/transport/http/web/handler_test.go`      | `apps/website/src/pages/profile/__tests__/profile-page-flow.test.tsx`                                                                                                                                                                                                              | Currently only indirectly covered by `apps/website/e2e/app-shell.real-runtime.spec.ts`                     | Partially covered | Profile has main story coverage, but lacks a standalone e2e and a clearer account-level verification chain                                                                 |
| Story 4B: User actively logs out and ends the current session                           | `docs/product/identity-and-tenant.md`      | Missing                                                                                                                                                                                                                                                     | `apps/backend/internal/identity/application/identity_sessions_test.go`                                                                             | `apps/backend/internal/identity/transport/http/web/handler_test.go`                                                       | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Partially covered | Backend covers logout semantics, but formal page flow / e2e is still missing                                                                         |
| Story 5A: Admin manages organization, workspace, and current work context  | `docs/product/identity-and-tenant.md`      | `apps/backend/internal/tenant/domain/workspace_settings_test.go`                                                                                                                                                                                         | `apps/backend/internal/tenant/application/organizations_and_workspaces_test.go`                                                                    | `apps/backend/internal/http/web_routes_test.go`, `apps/backend/internal/http/web_organization_settings_generated_test.go` | `apps/website/src/pages/shell/__tests__/workspace-shell-page-flow.test.tsx`                                                                                                                                                                                                        | `apps/website/e2e/app-shell.spec.ts`, `apps/website/e2e/app-shell.real-runtime.spec.ts` | Partially covered | Shell has shown workspace switching, but the full organization/workspace lifecycle and page chain are still incomplete                                             |
| Story 5: Admin manages workspace settings                                  | `docs/product/identity-and-tenant.md`      | `apps/backend/internal/tenant/domain/workspace_settings_test.go`                                                                                                                                                                                         | `apps/backend/internal/tenant/application/organizations_and_workspaces_test.go`, `apps/backend/internal/billing/application/billing_facts_test.go` | `apps/backend/internal/http/web_routes_test.go`, `apps/backend/internal/http/web_organization_settings_generated_test.go` | `apps/website/src/pages/settings/__tests__/settings-page-flow.test.tsx`                                                                                                                                                                                                            | Currently only indirectly covered by `apps/website/e2e/app-shell.real-runtime.spec.ts`                     | Partially covered | Lacks a standalone settings e2e; brand assets and historical-fact chain after organization/workspace deactivation are still uncovered                                                                     |
| Story 6: Admin manages the member lifecycle                                | `docs/product/membership-and-access.md`    | `apps/backend/internal/membership/domain/workspace_member_test.go`                                                                                                                                                                                       | `apps/backend/internal/membership/application/workspace_members_test.go`                                                                           | Missing                                                                                                                      | `apps/website/src/pages/members/__tests__/workspace-members-page-flow.test.tsx`                                                                                                                                                                                                    | Missing                                                                                    | Partially covered | Invite/join/disable/restore/remove lack contract and e2e; current page flow only covers list and invite entry                                               |
| Story 6A: Admin manages member rates and cost settings                         | `docs/product/membership-and-access.md`    | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Story is added but there is still no rate/cost test landing in the current repo                                                                             |
| Story 7: Member permissions affect visibility of private projects, reports, and events                | `docs/product/membership-and-access.md`    | `apps/backend/internal/catalog/domain/project_access_test.go`                                                                                                                                                                                            | `apps/backend/internal/catalog/application/catalog_objects_test.go`                                                                                | Missing                                                                                                                      | `apps/website/src/pages/projects/__tests__/projects-page-flow.test.tsx`, `apps/website/src/pages/permission-config/__tests__/permission-config-page-flow.test.tsx`                                                                                                                 | Missing                                                                                    | Partially covered | Existing tests only partially cover project access and permission config; reports / webhooks visibility linkage has no evidence                                                     |
| Story 7A: Admin manages groups and member membership                         | `docs/product/membership-and-access.md`    | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | `apps/website/src/pages/groups/__tests__/groups-page-flow.test.tsx`                                                                                                                                                                                                                | Missing                                                                                    | Partially covered | Story added, but current implementation and page flow are still explicitly transitional; backend/contract/e2e all missing                                                      |
| Story 7B: Admin configures workspace permission policies                             | `docs/product/membership-and-access.md`    | Missing                                                                                                                                                                                                                                                     | `apps/backend/internal/http/web_workspace_permissions_flow_test.go`                                                                                | Missing                                                                                                                      | `apps/website/src/pages/permission-config/__tests__/permission-config-page-flow.test.tsx`                                                                                                                                                                                          | `apps/website/e2e/permission-config.real-runtime.spec.ts`                               | Partially covered | Backend route integration and real-runtime save/reload chain added, but transport contract and finer permission rules not yet closed                                       |
| Story 8: User views, saves, and shares reports                              | `docs/product/reports-and-sharing.md`      | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Report pages, saved reports, shared reports, and export consistency are not yet in tests                                                                            |
| Story 8A: User keeps the same query semantics across different reports read views          | `docs/product/reports-and-sharing.md`      | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | No tests yet for the unified query semantics across detailed / summary / weekly / trends / profitability / insights                                          |
| Story 8B: User exports a report and reuses the same query definition                       | `docs/product/reports-and-sharing.md`      | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | No acceptance chain yet for exports and online query sharing the same semantics                                                                                        |
| Story 9: Reports preserve historical facts after historical objects change                    | `docs/product/reports-and-sharing.md`      | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | No tests yet for reports preserving facts after historical objects become inactive                                                                                       |
| Story 10: User imports Toggl data                                  | `docs/product/importing.md`                | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Import success, partial failure, conflict, and retry chains have no tests                                                                                   |
| Story 10A: User views import task status, diagnostic info, and retries                | `docs/product/importing.md`                | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Import task list, diagnostics page, and formal retry flow still have no tests                                                                                     |
| Story 11: Admin manages Webhook subscriptions                              | `docs/product/Webhooks.md`                 | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Subscription create / validate / ping / permission drift all uncovered                                                               |
| Story 12: Admin views and controls subscription health                         | `docs/product/Webhooks.md`                 | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Status page, failure history, and re-enable semantics are not yet in tests                                                                                      |
| Story 13: Admin manages plans, subscriptions, and quotas                           | `docs/product/billing-and-subscription.md` | `apps/backend/internal/billing/domain/subscription_test.go`, `apps/backend/internal/billing/domain/quota_window_test.go`, `apps/backend/internal/billing/domain/feature_gate_test.go`, `apps/backend/internal/billing/domain/commercial_account_test.go` | `apps/backend/internal/billing/application/billing_facts_test.go`                                                                                  | `apps/backend/internal/bootstrap/web_runtime_capabilities_quota_test.go`                                                  | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Partially covered | Web acceptance chain for the billing page and capability/quota is missing; current coverage is mostly backend rules                                                                      |
| Story 13A: Admin manages customer, invoice, and payment-related state    | `docs/product/billing-and-subscription.md` | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Formal stories for customer / invoice / payment are added, but current test landings are empty                                                                                 |
| Story 14: Admin handles over-limit state after a downgrade                           | `docs/product/billing-and-subscription.md` | `apps/backend/internal/billing/domain/subscription_test.go`, `apps/backend/internal/billing/domain/feature_gate_test.go`                                                                                                                                 | `apps/backend/internal/billing/application/billing_facts_test.go`                                                                                  | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Partially covered | Over-limit object handling after downgrade and admin-page feedback have no formal page or e2e evidence                                                                                 |
| Story 15: Site owner completes the first-admin bootstrap                         | `docs/product/instance-admin.md`           | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | The instance-admin product surface is still a full blank at the test layer                                                                                   |
| Story 16: Site owner manages registration policies and instance-level user governance                     | `docs/product/instance-admin.md`           | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Registration policies and instance-level user governance have no test entry yet                                                                                            |
| Story 17: Site owner manages instance-level configuration and provider state                   | `docs/product/instance-admin.md`           | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Instance-level configuration and provider state have no test entry yet                                                                                          |
| Story 18: Site owner views instance health, maintenance state, and audit records                 | `docs/product/instance-admin.md`           | Missing                                                                                                                                                                                                                                                     | Missing                                                                                                                                               | Missing                                                                                                                      | Missing                                                                                                                                                                                                                                                                               | Missing                                                                                    | Missing     | Health, maintenance mode, audit, and background-task state have no test entry yet                                                                                  |

### Stage 2 Active Plan Coverage Snapshot

This lists only stories directly related to the Stage 2 active foundation plan, with the main levels required by `docs/core/testing-strategy.md` explicitly aligned.

`Y` = primary evidence exists, `P` = partially covered, `N` = missing, `D` = approved deferral with an owner.

| Story                                   | Stage 2 primary owning plan                                                                  | Domain Unit | Application Integration | Transport Contract | Async Runtime | Frontend Feature | Frontend Page Flow | E2E / Real Runtime | Public Contract Golden | Current status   | Notes                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ----------- | ----------------------- | ------------------ | ------------- | ---------------- | ------------------ | ------------------ | ---------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `4` Login and enter workspace                   | `foundation/identity-session-tenant-and-billing-foundation`                         | Y           | Y                       | Y                  | N             | P                | Y                  | Y                  | N                      | Covered     | auth/shell page flow and app-shell e2e chain exist                                                     |
| `4A` Account profile/preferences/API token           | `foundation/identity-session-tenant-and-billing-foundation`                         | Y           | Y                       | Y                  | N             | P                | Y                  | P                  | N                      | Partially covered   | Standalone profile e2e missing                                                                                |
| `4B` Logout and end session                 | `foundation/one-way-structure-governance`                                           | N           | Y                       | Y                  | N             | N                | N                  | N                  | N                      | Partially covered   | Only backend/contract partial coverage; page chain missing                                                        |
| `5A` Organization/workspace context management | `foundation/identity-session-tenant-and-billing-foundation`                         | P           | Y                       | Y                  | N             | P                | Y                  | P                  | N                      | Partially covered   | Lifecycle and standalone e2e still incomplete                                                                       |
| `5` Workspace settings                         | `foundation/identity-session-tenant-and-billing-foundation`                         | P           | Y                       | Y                  | N             | P                | Y                  | P                  | N                      | Partially covered   | Standalone settings e2e, brand, and historical-fact chain still missing                                                           |
| `13` Plan/subscription/quota                    | `foundation/identity-session-tenant-and-billing-foundation`                         | Y           | Y                       | P                  | N             | N                | N                  | N                  | N                      | Partially covered   | Backend rules are fairly complete, but Web page-flow/e2e is missing                                                     |
| `14` Downgrade and over-limit handling                    | `foundation/identity-session-tenant-and-billing-foundation`                         | Y           | Y                       | N                  | N             | N                | N                  | N                  | N                      | Partially covered   | UI and e2e evidence after downgrade missing                                                                         |
| `3A` Catalog object management                  | `foundation/one-way-structure-governance` + `product/membership-access-and-catalog` | P           | P                       | N                  | N             | P                | Y                  | N                  | N                      | Partially covered   | Projects/clients/tasks/tags page flow exists; e2e/contract missing                                       |
| `7` Permissions affect visibility                     | `foundation/one-way-structure-governance` + `product/membership-access-and-catalog` | P           | P                       | N                  | N             | P                | P                  | N                  | N                      | Partially covered   | Reports/webhooks visibility linkage evidence missing                                                                 |
| `7A` Groups and member membership                 | `foundation/one-way-structure-governance` + `product/membership-access-and-catalog` | N           | N                       | N                  | N             | P                | Y                  | N                  | N                      | Partially covered   | Page flow still transitional; backend/contract/e2e missing                                                   |
| `7B` Permission policy configuration                      | `foundation/one-way-structure-governance` + `product/membership-access-and-catalog` | N           | Y                       | N                  | N             | P                | Y                  | Y                  | N                      | Partially covered   | Backend route integration and direct real-runtime save/reload chain exist, but transport contract and finer permission rules are still missing |
| `15-18` instance-admin                 | `product/instance-admin-and-platform-operations`                                    | N           | N                       | N                  | N             | N                | N                  | N                  | N                      | Approved deferral | Stage 2 foundation only delivers runtime gating and does not close platform product stories                                          |

### Formal page family mapping

| Page family                                            | PRD source                                | Figma / fallback source                                                                                                                                                                                                                              | Current implementation page                                                                                                    | Page Flow evidence                                                                          | E2E / Real Runtime evidence                                                                 | Current status | Notes                                                                                                                                                                                                                                        |
| ------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timer page family (`calendar` / `list` / `timesheet`) | `docs/product/tracking.md`              | Figma `timer calendar mode` node `8:3029`, `timer listview` node `12:2948`, `timer timesheet mode` node `10:13202`; Screenshots `toggl-timer-calendar-view-week.png`, `toggl-timer-list-view-all-dates.png`, `toggl-timer-timesheet-view-week.png` | `apps/website/src/pages/shell/WorkspaceTimerPage.tsx`                                                                       | Missing                                                                                      | `apps/website/e2e/timer-page.real-runtime.spec.ts`                                      | Partially covered | Formal timer page entry, in-page view switching, and start/stop real-runtime chain are established, but the page flow / screenshot evidence chain is not yet closed; stays red until [tracking-core-transactions.md](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md) is closed |
| Auth                                              | `docs/product/identity-and-tenant.md`   | No standalone Figma node recorded in the PRD yet                                                                                                                                                                                                 | `apps/website/src/pages/auth/AuthPage.tsx`                                                                                  | `apps/website/src/pages/auth/__tests__/auth-page-flow.test.tsx`                           | `apps/website/e2e/app-shell.spec.ts`, `apps/website/e2e/app-shell.real-runtime.spec.ts` | Partially covered | register/login are regressable; logout has not yet formed a formal evidence chain                                                                                                                                                                            |
| Shared App Shell                                  | `docs/product/tracking.md`              | Figma `left nav`, node `8:2829`                                                                                                                                                                                                                    | `apps/website/src/pages/shell/WorkspaceOverviewPage.tsx`                                                                    | `apps/website/src/pages/shell/__tests__/workspace-shell-page-flow.test.tsx`               | `apps/website/e2e/app-shell.spec.ts`, `apps/website/e2e/app-shell.real-runtime.spec.ts` | Covered   | Screenshot evidence still missing; see Wave 1.5 notes in the plan                                                                                                                                                                      |
| Profile                                           | `docs/product/identity-and-tenant.md`   | Figma `profile`, node `10:14814`                                                                                                                                                                                                                   | `apps/website/src/pages/profile/ProfilePage.tsx`                                                                            | `apps/website/src/pages/profile/__tests__/profile-page-flow.test.tsx`                     | Currently only indirectly covered by `apps/website/e2e/app-shell.real-runtime.spec.ts`                     | Partially covered | Standalone profile e2e and screenshot evidence missing                                                                                                                                                                                             |
| Settings                                          | `docs/product/identity-and-tenant.md`   | Figma `settings`, node `11:3680`                                                                                                                                                                                                                   | `apps/website/src/pages/settings/WorkspaceSettingsPage.tsx`, `apps/website/src/pages/settings/OrganizationSettingsPage.tsx` | `apps/website/src/pages/settings/__tests__/settings-page-flow.test.tsx`                   | Currently only indirectly covered by `apps/website/e2e/app-shell.real-runtime.spec.ts`                     | Partially covered | Standalone settings e2e and screenshot evidence missing                                                                                                                                                                                            |
| Projects                                          | `docs/product/tracking.md`              | Figma `project list`, node `10:20028`; Screenshot `toggl-projects-list.png`                                                                                                                                                                        | `apps/website/src/pages/projects/ProjectsPage.tsx`, `apps/website/src/pages/projects/ProjectDetailPage.tsx`                 | `apps/website/src/pages/projects/__tests__/projects-page-flow.test.tsx`                   | Missing                                                                                    | Partially covered | Page flow exists, but the plan has explicitly identified missing formal product-surface alignment and e2e beyond filters and archive/pin                                                                                                                              |
| Clients                                           | `docs/product/tracking.md`              | Figma `client`, node `12:3281`                                                                                                                                                                                                                     | `apps/website/src/pages/clients/ClientsPage.tsx`, `apps/website/src/pages/clients/ClientDetailPage.tsx`                     | `apps/website/src/pages/clients/__tests__/clients-page-flow.test.tsx`                     | Missing                                                                                    | Partially covered | No standalone screenshot currently; e2e and more complete formal capability coverage missing                                                                                                                                                                              |
| Tasks                                             | `docs/product/tracking.md`              | Uses `project page` as the fallback skeleton; `docs/product/tracking.md` explicitly forbids creating a separate placeholder page family                                                                                                                                                 | `apps/website/src/pages/tasks/TasksPage.tsx`                                                                                | `apps/website/src/pages/tasks/__tests__/tasks-page-flow.test.tsx`                         | Missing                                                                                    | Partially covered | URL state and workspace switch are covered, but standalone Figma node and e2e are missing                                                                                                                                                                             |
| Tags                                              | `docs/product/tracking.md`              | Uses `project page` as the fallback skeleton; no standalone Figma node / screenshot currently                                                                                                                                                                           | `apps/website/src/pages/tags/TagsPage.tsx`, `apps/website/src/pages/tags/TagDetailPage.tsx`                                 | `apps/website/src/pages/tags/__tests__/tags-page-flow.test.tsx`                           | Missing                                                                                    | Partially covered | e2e missing; more detail required later when a standalone visual-alignment source is added                                                                                                                                                                            |
| Workspace Members                                 | `docs/product/membership-and-access.md` | The plan currently only permits reusing the left nav shared shell; a dedicated Figma or explicit fallback has not yet been added                                                                                                                                                          | `apps/website/src/pages/members/WorkspaceMembersPage.tsx`                                                                   | `apps/website/src/pages/members/__tests__/workspace-members-page-flow.test.tsx`           | Missing                                                                                    | Partially covered | Current page flow only shows list and invite entry; the page source doc still needs to be added                                                                                                                                                                                   |
| Groups                                            | `docs/product/membership-and-access.md` | The plan currently only permits reusing the left nav shared shell; a dedicated Figma or explicit fallback has not yet been added                                                                                                                                                          | `apps/website/src/pages/groups/GroupsPage.tsx`                                                                              | `apps/website/src/pages/groups/__tests__/groups-page-flow.test.tsx`                       | Missing                                                                                    | Partially covered | Current implementation and tests explicitly mark this as still transitional; cannot be treated as formal completion evidence                                                                                                                                                                    |
| Permission Config                                 | `docs/product/membership-and-access.md` | The plan currently only permits reusing the left nav shared shell; a dedicated Figma or explicit fallback has not yet been added                                                                                                                                                          | `apps/website/src/pages/permission-config/PermissionConfigPage.tsx`                                                         | `apps/website/src/pages/permission-config/__tests__/permission-config-page-flow.test.tsx` | `apps/website/e2e/permission-config.real-runtime.spec.ts`                               | Partially covered | Direct real-runtime save/reload verification has been added, but page source and transport contract evidence are still incomplete                                                                                                                                           |
| Integrations Webhooks                             | `docs/product/Webhooks.md`              | No standalone Figma node is currently captured in product docs; using PRD + openapi/toggl-webhooks-v1.swagger.json as fallback design source                                                                                                                                                        | No formal `integrations webhooks` page family mapping established yet                                                                           | Missing                                                                                      | Missing                                                                                    | Missing     | One of the formal page families required by testing-strategy; need to build page-flow/E2E evidence in [webhooks-runtime.md](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/webhooks-runtime.md)                                                                                |

### Current priority gaps

- Tracking stories 1-3 are still an entire block of missing coverage; this directly corresponds to the `timer` page family page flow and core e2e gaps required by testing-strategy.
- Reports, Importing, and Webhooks stories 8-12 currently have no formal test mapping; before entering the corresponding waves, story-to-test-layer landings must be added.
- Billing stories 13-14 currently only have backend rules and partial contract evidence; formal pages and e2e are still missing.
- In the Wave 2 page families, `projects/clients/tasks/tags/members/groups` are still essentially at "has page flow but no complete page flow + e2e + Figma/fallback evidence chain"; `permission-config` has added direct real-runtime E2E, but the transport contract and page source chain are still not closed.

## Source Documents

- `docs/core/testing-strategy.md`
- `docs/core/product-definition.md`
- `docs/product/tracking.md`
- `docs/product/identity-and-tenant.md`
- `docs/product/membership-and-access.md`
- `docs/product/reports-and-sharing.md`
- `docs/product/Webhooks.md`
- `docs/product/billing-and-subscription.md`
- `docs/product/importing.md`
- `docs/product/instance-admin.md`
