# OpenToggl Frontend Architecture

This document defines the target structure of the Web frontend and focuses on answering:

- How pages, features, entities, and shared are split
- How server state, URL state, form state, and local UI state are split
- How component boundaries, shared components, and design system components are managed
- How data and state land when a Figma page is mapped into the implementation

This document only discusses implementation structure; page semantics still follow the corresponding `docs/product/*.md`.

## 0. Tech Stack Decisions

The frontend must be explicit down to concrete libraries, not just abstract layering.

The currently recommended formal tech stack is:

- UI framework: `React`
- toolchain: `Vite+`
- router: `TanStack Router`
- server state: `TanStack Query`
- forms: `react-hook-form` + `zod`
- UI primitives: `baseui`
- utility styling: `tailwindcss@4`
- styling engine: `styletron`

Notes:

- `Vite+` is the toolchain; it does not decide the router, query, form or UI framework solution.
- `TanStack Router` is a good fit for a URL-state-heavy, filter-heavy application like this; but only view switches that truly enter the address bar are the router's responsibility.
- `TanStack Query` is a good fit for server-state-intensive product surfaces like tracking / reports.
- `baseui` is a good fit for data-dense forms, tables, popovers, drawers, select, date/time scenarios.
- `tailwindcss@4` is a formal constraint, not an optional preference; it is used by default for page layout, spacing, grid, responsive design, and general utility class composition.
- `styletron` is retained because `baseui`'s theme, override and styling engine rely on it; this is not an either/or choice with Tailwind.
- `packages/web-ui` is an application-level UI package based on `baseui`; we do not build another design system from scratch.

## 1. Target Directory

```text
apps/website/
  src/
    app/
    routes/
    pages/
    features/
    entities/
    shared/
      api/
      query/
      session/
      url-state/
      forms/
      ui/
      lib/

packages/
  web-ui/
  shared-contracts/
```

Notes:

- The real application directory today is `apps/website`; both the documentation and implementation should take it as the source of truth first.
- Only when the application boundary is formally refactored should we consider renaming it to `apps/web`.
- `packages/web-ui` only carries `baseui`-based theme, tokens and thin wrapper components; it does not own business semantics.
- `packages/shared-contracts` only carries externally-public contract types, schemas or generated artifacts; no view models go here.

`packages/web-ui` is retained instead of dumping a bunch of components into `apps/website/src/components`, because:

- It expresses "the application-level UI baseline shared across pages and product surfaces", not some page's own component folder.
- `baseui`'s theme, tokens, overrides, table shell, form shell, page shell and similar capabilities are naturally shared assets.
- Putting it under `packages/` forces it to not depend on pages, features, routes, or session — structurally preventing business semantics from leaking in.
- `src/components` naturally degrades into a "throw anything in here" junk drawer, which is exactly what we want to avoid.

So the rule here is not "we have some shared components", but:

- `apps/website/src/*` holds product implementation
- `packages/web-ui` holds the application-level UI baseline

## 2. Layer Responsibilities

### 2.1 `app/`

Responsible for:

- Application bootstrap
- provider assembly
- router registration
- Global app shell
- error boundary, theme, i18n, session bootstrap

Minimum provider composition:

- `StyletronProvider`
- `BaseProvider`
- `QueryClientProvider`
- `RouterProvider`
- session / auth provider

Not responsible for:

- Concrete business page logic
- Entity mapping
- Internal state machines of features

### 2.2 `routes/`

Responsible for:

- `TanStack Router` route tree
- route-level guards
- path params / search params schema
- URL-bound loader/redirect
- URL normalization for view switching and filter state

Rules:

- `routes/` is not a generic "routes directory" — it is the formal entry point for `TanStack Router`.
- search params must have a schema; pages must not scatter their own parse logic.
- `routes/` owns "how you enter a page", not "how the page works internally".
- Complex page data composition does not go in `routes/`, but in `pages/` or `shared/query/`.
- Names for pages, features, entities, queries, adapters, test files and UI components may only express capabilities, objects, route semantics, or shared boundaries; execution phases and transition states do not belong to the semantic set allowed for long-term implementation naming.

### 2.3 `pages/`

Responsible for:

- Page assembly
- Page-level layout partitioning
- Composing multiple features/entities into a complete page
- Receiving route params, search params and passing them down

Rules:

- `pages/` may read query hooks, URL state, session, but must not directly write low-level request details.
- `pages/` does not carry business flows reusable across pages — those belong to `features/`.

Explicitly forbidden:

- `pages/` directly calling `fetch`, `webRequest` or an equivalent low-level client
- `pages/` directly consuming raw backend DTOs and assembling display semantics internally
- `pages/` directly carrying mutation flows, submission orchestration, error recovery or batch operation state machines
- `pages/` skipping the `feature` / `entity` split for the reason "it's currently just a simple list/form page"

### 2.4 `features/`

Responsible for:

- User action flows
- Interactions with side effects
- Small-scope business state machines
- Form submission, batch operations, modal/drawer workflows

Typical features:

- `start-timer`
- `stop-timer`
- `edit-time-entry`
- `bulk-update-time-entries`
- `create-project`
- `archive-project`

Rules:

- A `feature` is sliced by action, not by visual block.
- A feature may be reused by multiple pages.
- A `feature` may depend on `entities/` and `shared/*`, but not on other features.

### 2.5 `entities/`

Responsible for:

- Domain-object presentation components
- DTO -> view model mapping
- entity label / badge / row / card / summary and other presentation units
- selector/filter helpers related to a single entity without complex flows

Rules:

- Pages and features should consume entity view models as much as possible, not raw DTOs directly.
- The formatting rules, state copy, color mapping, and display fields for the same entity should be consolidated in `entities/`.

This rule also applies to generated contract types:

- `packages/shared-contracts` only carries public contract types, schemas and generated artifacts
- View models, page display semantics, empty/status copy, and derived fields do not go into `shared-contracts`
- If a page directly depends on contract-generated types to do display composition, by default that indicates the `entity` layer is missing

### 2.6 `shared/*`

Fixed responsibilities:

- `shared/api/`: HTTP client, request/response schema, API adapter
- `shared/query/`: `TanStack Query` query keys, fetch hooks, mutation wrappers, cache strategies
- `shared/session/`: current user, workspace, auth context
- `shared/url-state/`: filters, sorting, pagination, view switching synced with `TanStack Router` search params
- `shared/forms/`: `react-hook-form` + `zod` schemas, default values, DTO/form adapters
- `shared/ui/`: general components shared within the application but not yet lifted into the `baseui` thin-wrapper layer
- `shared/lib/`: pure functions, date/currency/duration formatting, general helpers

## 3. State Management Rules

Frontend state is strictly divided into four categories, which must not be mixed.

### 3.1 Server State

Definition:

- Comes from the backend
- Needs caching, refetching, invalidation, optimistic update or concurrency protection

Rules:

- Must live in `shared/query/`
- Must be managed by a unified `TanStack Query` query key
- Pages must not maintain a second "in-sync server mirror" of their own
- cache invalidation or cache update after a successful mutation must be defined centrally

Typical examples:

- The current workspace's time entries
- running timer
- projects / clients / tags lists
- timesheet summary
- webhook subscriptions

### 3.2 URL State

Definition:

- Should be reflected in the address bar
- Must be preserved on reload, share, back, forward

Rules:

- Must live in `shared/url-state/`
- Must be parsed uniformly through the `TanStack Router` search params schema
- Stays bidirectionally in sync with route params and search params
- Must not be hidden only in a component's local state
- Do not stuff intra-page view switches that don't change the address bar in the upstream product into search params

Typical examples:

- Date range
- Search term, filters, sorting, pagination
- Currently selected workspace, report preset, tab

### 3.3 Form State

Definition:

- A draft the user has not yet submitted
- Requires validation, dirty tracking, and pre-submit transformation

Rules:

- Must be organized through `react-hook-form` and the schemas / adapters in `shared/forms/`
- Form drafts must not be written into the query cache directly
- DTO and form model may differ

Typical examples:

- New time entry
- Editing a project
- Webhook subscription configuration
- Expense submission form

### 3.4 Local UI State

Definition:

- Purely presentational, short-lived, no need to share or persist

Rules:

- Only stays in a page or feature
- Uses component local state by default
- Does not introduce a global store by default

Typical examples:

- Modal open/close
- `calendar | list | timesheet` switching inside the `timer` page
- hover / expanded / selected row
- column resize
- panel collapse

### 3.5 Global Store Rules

By default, do not introduce a general-purpose global store such as `zustand` / `redux`.

It may only be added when all of the following are true:

- The state is shared across multiple pages that are not parent-child
- It is not server state
- It is not URL state
- It is not a form draft
- Putting it in `session/` or a provider would cause obvious coupling or performance problems

Allowed rare candidates:

- Global command palette
- Temporary UI workflows coordinated across multiple regions
- Browser-level offline/reconnect hint state

Before adding a global store, review must explicitly state "why `TanStack Query` / router search state / form state / local state are all unsuitable".

## 4. Component Management Rules

Components are split into four layers:

- `pages/*`: page skeleton and region assembly
- `features/*`: business components with behavior
- `entities/*`: entity presentation components
- `shared/ui` or `packages/web-ui`: pure general UI components based on `baseui`

Judgment rules:

- If the component knows how to submit, delete, start, stop — it belongs to `feature`
- If the component only presents an entity or entity fragment — it belongs to `entity`
- If the component knows nothing about business objects and only cares about visual and interaction primitives — it belongs to `shared/ui` or `packages/web-ui`
- If the component only does layout assembly inside a specific page — it belongs to `page`

Styling division of responsibilities:

- Page-level layout, grid, stack, spacing, sizing, responsive switching use `tailwindcss@4` by default
- Theme, override, and complex interaction styles on `baseui` primitives continue to be managed through `styletron` and `packages/web-ui`
- Do not introduce another CSS-in-JS solution in parallel at the page layer
- Do not stuff business-semantic style tokens into globally scattered CSS files; consolidate them via Tailwind utilities or `packages/web-ui` first

Forbidden:

- Dumping anything "that looks like a card" into `web-ui`
- Writing DTO mapping, permission copy, or business-state colors into design system components
- Pages directly inlining complex business components and bypassing `feature`

## 5. Completion Criteria for Formal Pages and Exit Rules for Placeholder Pages

The completion criterion for a formal page is not only "the API works, forms submit, lists render".

If the corresponding PRD has bound a Figma node or explicit fallback skeleton source, the page must satisfy all of the following at completion:

- `PRD -> Figma node or fallback -> page implementation -> page flow/e2e -> screenshot or evidence` has been recorded
- Page information architecture, primary/secondary regions, key states, and shared navigation semantics have been aligned
- Empty, loading, and error states are no longer placeholder default copy or development-phase explanation copy
- Narratives like `placeholder`, `contract-backed`, `Wave x slice`, `tracer shell` are no longer used as completion evidence

The following cases are always transitional and must not be claimed as formally complete:

- General list/card/form placeholder pages waiting to "paste Figma later"
- Reusing the same page skeleton just to expand page count without aligning each page's product semantics
- Page copy still explaining that this is the current wave, a placeholder slice, or a contract-backed shell
- The page's Figma reference or fallback skeleton source has not yet been clarified

If a formal page can only exist temporarily in a transitional state, the task ticket must explicitly state:

- The currently missing Figma node or alignment evidence
- The gap between the temporary page and the target page
- The owning wave and gate to exit this transitional state

## 5. `packages/web-ui` and `baseui` Rules

Only if all of the following hold can something enter `packages/web-ui`:

- It does not depend on OpenToggl business objects
- It does not depend on routes, session, query, feature flags
- It can be reused across multiple pages and features
- Its API is named after visual and interaction capabilities, not business naming

The responsibilities of `packages/web-ui` are:

- Consolidate `baseui` theme / tokens / overrides
- Provide a limited set of thin wrapper components
- Unify the application-level visual baseline
- Take charge of the boundary between `baseui + styletron` and `tailwindcss@4`, consolidating design tokens and utility class conventions into a stable baseline

Not its responsibilities:

- Rebuilding primitives that `baseui` already has
- Disguising business-semantic components as the design system
- Starting a new component API outside of `baseui`

Division of responsibility with `apps/website/src/components`:

- Business components, page components, and entity components stay in `apps/website/src`
- Only UI baseline components reusable across pages and without business semantics enter `packages/web-ui`
- If a component needs to import route, query, session, entity, feature — it does not belong to `packages/web-ui`

Allowed:

- button, input, dialog, sheet, tabs, data-table shell
- empty-state skeleton, filter bar container, page header, toast primitive

Not allowed:

- `TimeEntryCard`
- `ProjectStatusBadge`
- `RunningTimerHeader`
- `BillingGateNotice`

These belong to `entities/` or `features/`.

Priority rules:

- Page and business component layout, spacing, and responsive design use `tailwindcss@4` first
- Where `baseui` can be used directly, use `baseui` first
- When unified theme / token / override is needed, wrap a layer in `packages/web-ui`
- Only when business semantics appear should it go into `entities/` or `features/`

## 6. Data Flow Rules

Default data flow:

```text
route params/search params
-> page
-> query hook / feature
-> entity view model
-> ui component
```

Rules:

- raw DTOs must not be passed directly into deep UI components
- view model mapping should live close to `entities/`
- When a feature submits a mutation, it uses an input model — do not pass form data unchanged to the low level
- When a page switches views, only the projection layer is swapped — do not duplicate an entire second data model

This rule is especially important for `tracking`'s `calendar/list/timesheet`: they share the same `timer` page, the same query/filter/date range, and the same running timer state — only the main content projection is switched, without entering the URL.

## 7. Page Families and Shells

The shared shell is held by `app/`, and includes at least:

- workspace switcher
- Left-side navigation
- running timer status entry
- profile/admin entry
- Global toast / dialog / command palette

Page family rules:

- `overview` and `timer` are two independent account-level page entries under the shared shell
- `timer`'s `calendar`, `list`, `timesheet` are three views inside the same page — not three independent URLs; entering `/timer` directly defaults to `calendar`
- `project`, `client`, `tag` share the same information-architecture skeleton, but differ in entity fields
- `profile` and `settings` must be separate — do not merge them into one giant settings page
- `integrations webhooks` is a formal product page in the first version — it must not be wrapped as an empty marketplace
- The shell page's root container must not hard-code a minimum page width; if a particular table, calendar, or chart needs a wider display surface, limit horizontal scrolling to that local content area rather than setting a fixed width on the entire page root node

The page semantics follow the corresponding `product` document — the frontend implementation must not rename them into a different information architecture on its own.

## 8. Frontend Test Entry Points

Frontend test layering follows [testing-strategy](./testing-strategy.md), but the minimum requirements are:

- `shared/lib` and entity mapper have unit tests
- Key features have component-level interaction tests
- Key page families have flow-level tests
- Formal pages already defined in Figma must have at least one regression-able page/flow test path

## 9. Review Checklist

Frontend review checks at minimum:

- Whether server state has been mistakenly put in local state or a store
- Whether URL state truly enters the address bar
- Whether DTOs are mapped to a view model first, then consumed by components
- Whether business components are mistakenly sunk into `web-ui`
- Whether a page is only doing assembly and not swallowing all the logic
- Whether the same page family shares the same query/filter/running timer source of truth
- Whether `TanStack Router` / `TanStack Query` / `baseui` have been bypassed with parallel mechanisms
