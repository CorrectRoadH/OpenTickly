# @opentickly/web-ui

Shared UI primitives for the OpenTickly web apps (`apps/website`, `apps/landing`). Consumed as
TypeScript source directly — no bundling step — so the app that imports it compiles it with its
own toolchain.

## Floating panels

There are two supported strategies for floating UI in this package. Pick based on what the panel
is, not on convenience:

- **Action menus / generic dropdowns** (`DropdownMenu`, `Dropdown` in `DropdownMenu.tsx`) **portal
  to `document.body`** via `createPortal`, and position themselves with
  `useFloatingPosition`/`computeFloatingStyle`. Use this strategy whenever the panel must escape an
  ancestor with `overflow: hidden` or a clipped stacking context (row action menus, the app shell's
  profile menu, etc).
- **In-flow filter panels** (`CheckboxFilterDropdown`, `RadioFilterDropdown`) use plain
  `position: absolute` inside a `position: relative` wrapper — no portal. These panels are
  intentionally **not** migrated to the portal strategy: portaling introduces stacking/paint-order
  risk relative to the toolbar and page content around them, and these panels don't need to escape
  any clipping ancestor in their current usage.

  Because they render in-flow, callers **must** place these filter dropdowns outside any
  `overflow-hidden` container, or the panel will be clipped. If a future usage needs to sit inside
  a scrollable/overflow-hidden toolbar, either restructure the container so the filter isn't a
  descendant of the `overflow-hidden` element, or migrate that specific usage to `Dropdown`/
  `DropdownMenu` — do not add a third floating strategy.

Both filter dropdowns share their trigger chrome (label + active state + clear affordance) and
panel container via the internal (non-exported) `FilterDropdownChrome.tsx`. `RadioFilterDropdown`
intentionally renders a dashed border in its inactive state (`CheckboxFilterDropdown` uses solid) —
this is a deliberate visual divergence, not drift, and is expressed via the
`inactiveBorderStyle="dashed"` prop on the shared `FilterTriggerButton`.

## Dismiss (click-outside + Escape)

`useDismiss.ts` is the single canonical click-outside/Escape hook. It accepts either one ref or an
array of refs (e.g. a trigger ref plus a portaled panel ref), so both the in-flow filter dropdowns
and the portaled `DropdownMenu`/`Dropdown` share the same implementation — there is no
component-local reimplementation of this behavior anywhere in the package.
