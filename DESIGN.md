# OpenToggl Design System

This document is the visual source of truth for the website workspace UI until a fuller token system is implemented in code.

Primary references:

- Figma `profile`, node `10:14814`
- Shared left nav inside the same Figma section, node `10:14627`
- Figma variables returned by MCP for the selected screen

This document is intentionally opinionated. If current code differs, the code should move toward these rules instead of inventing local page-specific styles.

## 1. Core Visual Direction

OpenToggl workspace UI uses a dense dark enterprise UI:

- Black-first workspace chrome
- Charcoal content surfaces
- White primary text
- Gray secondary text
- Magenta/pink accent for active state and interactive emphasis
- Tight, compact typography rather than oversized dashboard marketing styling

The product should feel like Toggl Track's operational workspace, not a separate dark theme experiment.

## 2. Color Roles

Use roles first. Raw hex values are implementation detail.

### Shell and Surface

- `workspace/nav`: `#0D0D0D`
- `page/background`: `#1B1B1B`
- `surface/default`: `#1B1B1B`
- `surface/raised`: `#232323` to `#242424`
- `surface/input`: `#1B1B1B`
- `border/default`: `#3A3A3A`
- `border/soft`: white at very low opacity only when already present in Figma

### Text

- `text/primary`: `#FFFFFF`
- `text/secondary`: `#A4A4A4`
- `text/tertiary`: `#999999`
- `text/disabled`: `#767676`

### Accent

- `accent/primary`: `#E57BD9`
- `accent/secondary`: `#CD7FC2`
- `accent/text`: `#F7D0F0`
- `accent/tinted-surface`: dark plum tint, not flat pink

Rules:

- Do not use bright saturated accent fills as large page backgrounds.
- Accent is for active nav, links, checkbox/radio states, emphasis labels, and focused interactive moments.
- Active workspace items should use tinted dark-plum backgrounds with light pink text, not plain gray fills.

## 3. Typography

### Font

```css
--font-ui: "Inter", sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

- **Inter**: the only UI font. Variable weight, load via `@fontsource-variable/inter`.
- **JetBrains Mono**: durations, timer display, numeric table cells only.
- `font-variant-numeric: tabular-nums` on any number column.

### Type Scale

Four sizes. That's it.

| Size | Weight    | Role                                               |
| ---- | --------- | -------------------------------------------------- |
| 20px | 600       | Page title only                                    |
| 14px | 400 / 600 | Body text, card headers, form labels, descriptions |
| 12px | 400 / 500 | Supporting text, timestamps, helper text, badges   |
| 11px | 600 upper | Column headers (uppercase), caps labels            |

Rules:

- Default everything is 14px. If you're unsure, use 14px.
- Page title is the only thing at 20px. One per page.
- 12px is for secondary/supporting info only.
- 11px uppercase is only for table column headers and label caps.
- No other sizes exist. No 9px, no 13px, no 16px, no 18px, no 21px.
- Durations and timer displays use `--font-mono` at the same size as surrounding text.

## 4. Shell Layout

### Left Navigation

- Total left nav width: `226px`
- Icon rail: `47px`
- Main nav panel: `179px`

This is already reflected in Figma and should stay stable across workspace pages.

### Main Content Frame

From the selected Figma screen:

- Content region width beside nav: `1384px` in the captured frame
- Standard inner page gutter: `20px`
- Standard card content gutter: `20px`
- Standard workspace top header row height: about `66px`

Rules:

- Shell pages should be fluid inside the main content region.
- Do not cap workspace page roots to narrow widths like `654px`.
- If a table, chart, or calendar needs more room, keep overflow local to that module, not the entire page.
- The main content area should read as a full-width workspace with inner gutters, not as a centered marketing column.

## 5. Card System

Profile/settings Figma establishes the canonical card pattern for workspace pages:

- Card background: same dark surface family as page background, slightly separated by border
- Border: `#3A3A3A`
- Corners: subtle rounding (`6px` to `8px`), not oversized pill rounding
- Header padding: roughly `20px`
- Body padding: roughly `20px`
- Title + subtitle stack is the default card header pattern

**Card depth behavior** (2.5D):

- Resting: `box-shadow: 0 2px 0 0 rgba(0, 0, 0, 0.15)` combined with border — the card sits slightly above the page canvas.
- Hover (when card is interactive/clickable): `translateY(-2px)`, shadow expands to `0 6px 16px rgba(0, 0, 0, 0.25)`, border brightens slightly. This signals the card is liftable.
- Active/pressed (when card is clickable): `translateY(0px)`, shadow compresses back, card presses flush into the surface.
- Static cards (settings panels, info displays): no hover lift. They have resting depth only.

Card transition: `160ms cubic-bezier(0.34, 1.56, 0.64, 1)` — slightly slower than buttons for a weightier feel.

Rules:

- Dashboard cards, settings cards, and workspace information panels should use the same card chassis unless the product explicitly needs a chart/report variant.
- Avoid introducing a separate dashboard-only geometry with tiny unreadable typography and compressed paddings.
- Clickable cards (project cards, report tiles) get the full hover-lift + press-down cycle.
- Non-interactive cards get resting depth only — no hover animation.

## 6. Controls

### 2.5D Interaction Model

OpenToggl uses a **tactile 2.5D interaction style** inspired by PostHog. Every interactive element communicates depth through shadow, position, and border shifts. The UI should feel like physical controls that respond to touch — buttons press down, cards lift on hover, surfaces have clear Z-layer separation.

Core depth principles:

- **Resting state**: elements sit at a defined Z-level with a bottom shadow/border that implies a physical edge.
- **Hover state**: element lifts slightly (`translateY(-1px)`) with an expanded shadow, signaling interactivity.
- **Active/pressed state**: element pushes down (`translateY(1px)`) with a compressed shadow, simulating a button press.
- **Focus state**: accent outline ring layered on top of the current depth state.
- **Disabled state**: flattened — no shadow, no depth cue, reduced opacity.

Depth tokens (CSS custom properties):

- `--track-depth-border`: `#2a2a2a` — bottom/right edge color that simulates a 3D bevel on dark surfaces
- `--track-depth-highlight`: `rgba(255, 255, 255, 0.04)` — top/left edge highlight for the lit side of the bevel
- `--track-depth-offset-rest`: `0 2px 0 0` — resting bottom-edge shadow (box-shadow shorthand)
- `--track-depth-offset-hover`: `0 3px 0 0` — lifted bottom-edge shadow
- `--track-depth-offset-active`: `0 0px 0 0` — pressed state (no offset, element is flush)

Transition rules:

- All depth transitions use `120ms cubic-bezier(0.34, 1.56, 0.64, 1)` — a slight spring overshoot for tactile feel.
- `transform`, `box-shadow`, `border-color`, and `background` should all transition together.
- Never animate `width`, `height`, `padding`, or `margin` — these cause layout shift. Depth is expressed only through `transform` and `box-shadow`.

### Buttons

Default workspace buttons are compact and tactile:

- Height: `36px`
- Text size: 12px to 14px depending on role
- Border-first styling is common on settings/profile screens
- Filled accent buttons should be reserved for clear primary actions

**Primary button depth behavior** (filled accent):

- Resting: `background: var(--track-accent)`, `box-shadow: 0 2px 0 0 var(--track-accent-strong)`, subtle bottom bevel
- Hover: `translateY(-1px)`, `box-shadow: 0 3px 0 0 var(--track-accent-strong)`, background lightens slightly
- Active: `translateY(1px)`, `box-shadow: 0 0px 0 0 var(--track-accent-strong)`, element presses flush
- Disabled: no shadow, no transform, `opacity: 0.5`

**Secondary button depth behavior** (border-first):

- Resting: `background: transparent`, `border: 1px solid var(--track-border)`, `box-shadow: 0 2px 0 0 var(--track-depth-border)`
- Hover: `translateY(-1px)`, `box-shadow: 0 3px 0 0 var(--track-depth-border)`, border brightens to `var(--track-control-border)`
- Active: `translateY(1px)`, `box-shadow: 0 0px 0 0 var(--track-depth-border)`, presses flush
- Disabled: border fades, no shadow, no transform

**Ghost/tertiary button**: no resting depth. On hover gains a subtle surface fill (`var(--track-row-hover)`) and on active pushes down `1px`. No bottom-edge shadow.

Button principles:

- Buttons are part of the workspace chrome, not decorative marketing elements.
- The default workspace button should feel compact, tactile, and operational.
- The press-down animation is the primary interactive feedback. Every clickable button must have it.
- Primary buttons use the accent fill sparingly and only for the clearest next action in the local area.
- Secondary buttons should usually be border-first with a bottom-edge depth shadow.
- If two adjacent actions have similar importance, both should default to secondary rather than forcing a fake primary.
- Button text should stay short and direct. Do not solve hierarchy problems with larger type or oversized horizontal padding.
- Rounded corners should stay subtle. Shell buttons are not pills.
- Icon usage should support the label, not replace readable text by default.
- Disabled buttons flatten completely — no shadow, no depth, reduced opacity.
- Destructive intent should not be expressed by turning the entire workspace into a red theme; use dedicated destructive treatment only where the action is truly dangerous.

Button anti-patterns:

- Buttons without press-down animation (every interactive button must respond to click)
- Accent-filled buttons repeated across every card header
- More than one loud filled button in the same compact action group
- Page-local button colors that do not map to workspace tokens
- Oversized button radii, heights, or marketing-style shadows
- Icon-only buttons used where the action is not already obvious from context
- CSS transitions on `all` — only transition the specific depth properties

### Inputs and Selects

- Height: `36px` to `39px`
- Background: dark surface
- Border: `#3A3A3A`
- Text: white or secondary gray
- Labels: 11px to 12px compact labels above field

**Input depth behavior**:

- Resting: `box-shadow: 0 1px 0 0 var(--track-depth-border)` — subtle bottom edge
- Focus: bottom shadow stays, accent outline ring appears, background may subtly lighten
- No hover lift on inputs — they are receptive, not pushable

### Checkboxes and Small Toggles

- Use accent magenta for selected state
- Keep surrounding label copy in 14px/16px compact body scale
- Toggle switches animate with the same `120ms` spring curve
- Checkbox check-mark appearance should use a quick scale-in (`transform: scale(0) -> scale(1)`) with spring easing

## 7. Component System Rules

This workspace should be implemented from a small set of reusable component contracts rather than page-local styling.

### Component contract expectation

- Shared components should own the default workspace treatment for button, card, input, page-header, menu, modal, chip, and table-row patterns.
- Page files may compose those primitives, but should not restyle the same component category from scratch on each screen.
- If a page needs a genuine variant, define that variant at the shared component/token layer first.
- Component defaults should encode the workspace standards for border, radius, padding, text scale, and interaction states.

### Cards and panels

- Cards are the default container chassis for workspace content.
- The default card should use workspace surface, workspace border, subtle radius, and roughly 20px internal padding.
- Raised/muted cards may exist, but they must still read as the same family.
- Avoid one-off cards with special gray backgrounds, unrelated borders, or custom padding logic unless the module is a real exception such as a chart canvas.

### Page Title

The page title is the topmost element in the content area. One component, used on every page.

Structure:

```
┌──────────────────────────────────────────────────────────────┐
│  Page Title                              [Action] [Action]   │
│  Optional subtitle / breadcrumb                              │
└──────────────────────────────────────────────────────────────┘
```

Spec:

- Height: `66px` (fixed, aligns with shell header rhythm)
- Title: 20px/600
- Subtitle: 12px/400, `color: var(--track-text-muted)`
- Horizontal padding: `20px` (matches page gutter)
- Vertical alignment: center
- Right-side action group: compact buttons, right-aligned, vertically centered
- Bottom border: `1px solid var(--track-border)` — separates title from content below

Rules:

- Every page must use this exact component. No page-local title styling.
- Maximum two buttons in the action group. If more actions exist, use a "More" dropdown.
- Title text must not wrap. If it's too long, truncate with ellipsis.
- No icons in the title text. Icons belong in action buttons only.

### Toolbar (Filter Bar / Action Bar)

The toolbar sits directly below the page title. It contains filters, search, view toggles, and bulk actions.

Structure:

```
┌──────────────────────────────────────────────────────────────┐
│  [Search]  [Filter] [Filter] [Filter]     [View] [Sort] [+] │
└──────────────────────────────────────────────────────────────┘
```

Spec:

- Height: `48px` (fixed)
- Background: `var(--track-surface)` (same as page, no separate bar color)
- Bottom border: `1px solid var(--track-border)`
- Horizontal padding: `20px`
- Item gap: `8px`
- All controls within the toolbar are `32px` height (slightly smaller than page-level buttons to maintain density)

Filter chips:

- Resting: `background: var(--track-surface-muted)`, `border: 1px solid var(--track-border)`, `border-radius: 6px`
- Active (filter applied): `background: var(--track-accent-soft)`, `border-color: var(--track-accent-border)`, `color: var(--track-accent-text)`
- Hover: standard press-down depth behavior (same as secondary button but at 32px height)
- Text: 12px/500

Search input:

- Width: `200px` default, expands to `320px` on focus with `--duration-normal` + `--ease-out`
- Height: `32px`
- Left icon: search icon, `var(--track-text-muted)`
- Placeholder: `var(--track-control-placeholder)`

View toggles (list/grid/calendar):

- Icon-only buttons, `32px` square
- Active: `background: var(--track-accent-soft)`, icon in `var(--track-accent-text)`
- Inactive: transparent, icon in `var(--track-text-muted)`

Rules:

- The toolbar is optional — not every page needs one. But if filters/search exist, they go here.
- Toolbar must not scroll horizontally. If too many filters, use a "More filters" dropdown.
- Toolbar filters are always visible state — no hidden filter panel that slides down.
- Bulk action buttons appear in the toolbar when items are selected, replacing the right-side controls.

### List View (Table / Expandable Rows)

The primary data layout for workspace pages (time entries, projects, clients, tags, tasks).

#### Table Header

```
┌──────────────────────────────────────────────────────────────┐
│  NAME ▲         PROJECT        DURATION      ACTIONS         │
└──────────────────────────────────────────────────────────────┘
```

Spec:

- Height: `36px`
- Text: 11px/600, uppercase, `letter-spacing: 0.04em`
- Color: `var(--track-text-muted)`
- Background: `var(--track-surface-muted)`
- Bottom border: `1px solid var(--track-border)`
- Sticky: `position: sticky; top: 0` within the scroll container
- Sort indicator: small triangle icon, `var(--track-text-muted)` for inactive, `var(--track-accent)` for active sort

#### Table Row

```
┌──────────────────────────────────────────────────────────────┐
│  ▶ Task name      Project name    1:23:45      [···]        │
└──────────────────────────────────────────────────────────────┘
```

Spec:

- Height: `44px` (minimum, grows if content wraps)
- Text: 14px/400
- Duration: 14px/400, `--font-mono`, `tabular-nums`
- Background: `var(--track-surface)`
- Border bottom: `1px solid var(--track-border-soft)`
- Hover: `background: var(--track-row-hover)`, transition `--duration-fast`
- Selected: `background: var(--track-accent-soft)`, left accent border `2px solid var(--track-accent)`
- Horizontal padding: `20px` (aligns with page gutter)

Row actions:

- Appear on hover, right-aligned
- Icon buttons, `28px` square, ghost style
- Use `opacity: 0 → 1` on row hover with `--duration-fast`

#### Expandable Row

When a row has children (grouped time entries, subtasks), it uses an expand/collapse pattern.

```
┌──────────────────────────────────────────────────────────────┐
│  ▼ Monday, March 29            3 entries       5:23:12      │
├──────────────────────────────────────────────────────────────┤
│    Task A              Project X     1:23:45                 │
│    Task B              Project Y     2:15:00                 │
│    Task C              Project X     1:44:27                 │
└──────────────────────────────────────────────────────────────┘
```

Spec:

- Group header row: `48px` height, 14px/600
- Expand icon: `▶` rotates to `▼` with `--duration-fast` + `--ease-spring`
- Child rows: indented `20px` from parent, slightly muted background (`var(--track-surface)` vs parent `var(--track-surface-muted)`)
- Expand/collapse animation: children slide in via `max-height` or `grid-template-rows: 0fr → 1fr` with `--duration-slow` + `--ease-out`
- Group summary (count, total duration) appears right-aligned in group header

#### Tab Bar (within list view)

When a page has multiple data views (e.g., "All entries" / "Running" / "Saved"), tabs sit between the toolbar and the list.

```
┌──────────────────────────────────────────────────────────────┐
│  [All entries]  [Running]  [Saved filters]                   │
└──────────────────────────────────────────────────────────────┘
```

Spec:

- Height: `40px`
- Tab text: 14px/500
- Inactive tab: `color: var(--track-text-muted)`, no background
- Active tab: `color: var(--track-text)`, bottom indicator `2px solid var(--track-accent)`
- Active indicator animates between tabs: `translateX` + width morph with `--duration-normal` + `--ease-spring`
- Hover (inactive tab): `color: var(--track-text-soft)`, subtle background `var(--track-row-hover)`
- Tab bar sits flush against toolbar bottom border — no gap
- Bottom border: `1px solid var(--track-border)` (the active indicator overlaps this)

Rules:

- Maximum 5 tabs visible. More tabs go into a "More" dropdown at the end.
- Tab labels must be short (1-2 words). No wrapping.
- Tab counts (e.g., "Projects (12)") use 12px inline, `color: var(--track-text-muted)`

### Page Layout Composition

The canonical page layout stacks these components vertically:

```
┌─────────────────────────────────────────┐
│  Page Title + Actions                   │  66px fixed
├─────────────────────────────────────────┤
│  Toolbar (optional)                     │  48px fixed
├─────────────────────────────────────────┤
│  Tab Bar (optional)                     │  40px fixed
├─────────────────────────────────────────┤
│  Table Header                           │  36px sticky
├─────────────────────────────────────────┤
│  Table Rows (scrollable)                │  flex-grow
│  ...                                    │
│  ...                                    │
└─────────────────────────────────────────┘
```

Rules:

- The page content area (everything below the nav shell) uses `display: flex; flex-direction: column; height: 100vh` minus nav.
- Title, toolbar, and tab bar are **fixed height, non-scrollable**.
- Table header is **sticky** within the scrollable area.
- Table rows occupy the remaining space and scroll vertically.
- No horizontal scroll on the page body — table columns must fit or use internal horizontal scroll.
- Empty state: centered illustration + message in the scroll area, vertically centered.

### Inputs, menus, and dialogs

- Inputs, selects, comboboxes, and inline editors should all read as the same control family.
- Dropdowns, popovers, and dialogs should share overlay surface and overlay border roles instead of each file picking its own near-black.
- Search rows, picker panels, and context menus should look related even when their contents differ.

### Data views

- Tables, list rows, filter chips, and compact summary widgets should use one consistent density model.
- Row hover should come from shared hover roles, not custom backgrounds per page.
- Chart containers, legends, and tooltips should reuse card and overlay logic where possible instead of becoming a second UI system.

## 8. Motion & Interaction System

OpenToggl uses a restrained but tactile motion system. Every animation serves a purpose: confirming interaction, guiding attention, or expressing spatial relationships.

### Easing Curves

- `--ease-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)` — tactile spring with slight overshoot. Used for press/release, toggles, and interactive state changes.
- `--ease-out`: `cubic-bezier(0.16, 1, 0.3, 1)` — smooth deceleration. Used for entrances, reveals, and expanding panels.
- `--ease-in-out`: `cubic-bezier(0.65, 0, 0.35, 1)` — symmetric. Used for layout transitions and page-level changes.

### Duration Scale

- `--duration-instant`: `80ms` — micro feedback (checkbox tick, ripple start)
- `--duration-fast`: `120ms` — button press/release, icon state change
- `--duration-normal`: `200ms` — card hover lift, dropdown open, tooltip appear
- `--duration-slow`: `300ms` — panel expand/collapse, modal enter/exit
- `--duration-slower`: `500ms` — page transitions, large layout shifts

### Interaction Patterns

**Press-down (buttons, clickable chips, icon buttons)**:

```
hover:   translateY(-1px) + shadow expand + 120ms spring
active:  translateY(1px)  + shadow compress + 80ms spring
release: translateY(0)    + shadow restore  + 120ms spring
```

**Lift (clickable cards, project tiles)**:

```
hover:   translateY(-2px) + shadow expand + 160ms spring
active:  translateY(0)    + shadow compress + 100ms spring
release: translateY(0)    + shadow restore  + 160ms spring
```

**Reveal (dropdowns, tooltips, popovers)**:

```
enter:   opacity 0→1 + translateY(4px→0) + 200ms ease-out
exit:    opacity 1→0 + translateY(0→4px) + 150ms ease-in-out
```

**Toggle (switches, checkboxes)**:

```
on:      scale(0→1.1→1) + 120ms spring (the check/dot bounces in)
off:     scale(1→0)     + 80ms ease-out
```

**Nav item active indicator**:

```
slide:   translateX + width morph + 200ms spring (active indicator slides to new item)
```

### Motion Anti-Patterns

- No motion on non-interactive elements (static text, labels, dividers)
- No entrance animations on page load for workspace chrome — only content areas may fade in
- No bouncing/pulsing idle animations — motion is always in response to user action
- No parallax or scroll-linked animation in the workspace shell
- No `transition: all` — always specify exact properties
- Never animate `width`, `height`, `padding`, `margin` — use `transform` and `opacity` only for 60fps

## 9. Page Family Rules

### Shared Shell Pages

These pages must look like one product family:

- `overview`
- `timer`
- `reports`
- `projects`
- `clients`
- `tasks`
- `tags`
- `profile`
- `settings`

Shared workspace expectations:

- Same left nav width and styling
- Same page gutter system
- Same title hierarchy
- Same compact body scale
- Same dark card language
- Same accent family

### Overview-Specific Rule

`overview` is not allowed to become a narrow custom dashboard column. It should use the same full-width workspace frame as other pages and only constrain overflow inside charts or specialized widgets.

## 10. Token Mapping For Implementation

The current app already has partial token names in [styles.css](/Users/opentoggl-ci/Code/opentoggl/apps/website/src/app/styles.css) and [theme.ts](/Users/opentoggl-ci/Code/opentoggl/packages/web-ui/src/theme.ts). These should converge toward the Figma roles above.

Canonical workspace foundation:

- `--track-panel`: `#0D0D0D`
- `--track-canvas`: `#1B1B1B`
- `--track-surface`: `#1B1B1B`
- `--track-surface-muted`: `#232323`
- `--track-surface-raised`: `#242424`
- `--track-border`: `#3A3A3A`
- `--track-border-soft`: low-opacity white only where Figma already implies a soft edge
- `--track-text`: `#FFFFFF`
- `--track-text-muted`: `#A4A4A4`
- `--track-text-soft`: `#999999`
- `--track-text-disabled`: `#767676`
- `--track-accent`: `#E57BD9`
- `--track-accent-secondary`: `#CD7FC2`
- `--track-accent-soft`: dark plum tinted surface for active workspace items, selected chips, and restrained emphasis
- `--track-accent-text`: `#F7D0F0`

Required supporting tokens for implementation completeness:

- `--track-button`: normally aliases `--track-accent`
- `--track-button-text`: dark text on filled accent buttons
- `--track-input-bg`: input/dropdown field surface within the workspace dark family
- `--track-border-input`: softer field border variant when the control needs a lighter edge than the default card border
- `--track-row-hover`: muted surface hover state for rows, menu items, and icon buttons
- `--track-grid`: subdued gridline/divider tone for charts and dense data views
- `--track-overlay-surface`: canonical dropdown/popover/dialog surface, currently in the `#1F1F20` to `#242426` family
- `--track-overlay-border`: canonical dropdown/popover/dialog border, currently in the `#3D3D42` to `#3F3F44` family
- `--track-tooltip-surface`: canonical tooltip surface, currently in the `#2C2C2E` family

Required state and feedback tokens:

- `--track-state-neutral-surface`
- `--track-state-neutral-border`
- `--track-state-neutral-text`
- `--track-state-success-surface`
- `--track-state-success-border`
- `--track-state-success-text`
- `--track-state-error-surface`
- `--track-state-error-border`
- `--track-state-error-text`
- `--track-surface-error`
- `--track-surface-danger-alt`
- `--track-text-accent`

Required depth/2.5D tokens:

- `--track-depth-border`: `#2a2a2a` — bottom-edge bevel color for tactile depth
- `--track-depth-highlight`: `rgba(255, 255, 255, 0.04)` — top-edge highlight for lit bevel side
- `--track-depth-shadow-rest`: `0 2px 0 0 rgba(0, 0, 0, 0.2)` — resting bottom-edge shadow
- `--track-depth-shadow-hover`: `0 4px 8px rgba(0, 0, 0, 0.25)` — lifted shadow
- `--track-depth-shadow-active`: `0 0 0 0 transparent` — pressed flush (no shadow)
- `--track-depth-accent-shadow`: `0 2px 0 0 var(--track-accent-strong)` — bottom-edge for accent-filled buttons

Required motion tokens:

- `--ease-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- `--ease-out`: `cubic-bezier(0.16, 1, 0.3, 1)`
- `--ease-in-out`: `cubic-bezier(0.65, 0, 0.35, 1)`
- `--duration-instant`: `80ms`
- `--duration-fast`: `120ms`
- `--duration-normal`: `200ms`
- `--duration-slow`: `300ms`
- `--duration-slower`: `500ms`

Required chart/data-view roles:

- `--track-chart-bar`: primary filled chart bar in the accent family
- `--track-chart-bar-empty`: empty or remaining-state bar in the plum-muted family
- `--track-chart-tooltip`: aliases the tooltip surface unless a chart explicitly needs a stronger variant
- `--track-chart-series-*`: if a chart needs more than one semantic series, define named series tokens first instead of scattering page-local hex values

Rules:

- `--track-canvas` must stay in the same family as page background and `--track-surface`; it is not allowed to drift to an unrelated gray.
- Shell-facing code must not introduce raw hex values for workspace neutrals, workspace accent roles, overlays, inputs, or chart chrome when a semantic token exists or should exist.
- Raw hex is only acceptable for user-authored content colors, imported third-party brand marks, or decorative illustration art that is not part of the reusable workspace theme.
- `packages/web-ui/src/theme.ts` must cover the same semantic families as the CSS tokens: surface, text, border, accent, disabled, input, overlay, and status feedback.

## 11. Theme Coverage Requirements

This document is not complete unless the theme can style the whole workspace family without per-page color invention.

Minimum coverage required from the token system:

- page and nav chrome
- cards and raised surfaces
- inputs, selects, and inline editors
- primary and secondary buttons
- hover, active, selected, focused, and disabled states
- dropdowns, popovers, context menus, modals, and tooltips
- success, error, and neutral feedback surfaces
- chart bars, chart empties, chart gridlines, and chart tooltips

Implementation completeness means:

- workspace pages mostly consume semantic tokens rather than raw hex values
- shared web UI primitives expose the canonical workspace surfaces and button styles
- chart and overlay colors come from named roles, not per-file literals
- BaseUI theme overrides do not fall back to unrelated light-theme defaults for workspace surfaces

## 12. Anti-Patterns

Do not introduce these patterns in workspace pages:

- Narrow centered content columns for core workspace screens
- Arbitrary page-specific color palettes
- Repeated raw hex values instead of shared roles
- New dialog, menu, tooltip, or dropdown colors without first defining overlay roles
- New chart colors without first defining chart roles
- Large typography jumps between sibling pages
- Tiny 8px to 10px body copy used as the primary reading size
- Cards that invent their own border, radius, and padding system
- Accent usage that turns the UI into bright pink-on-black decoration instead of restrained enterprise emphasis
- Buttons without press-down depth response on click
- `transition: all` instead of explicit property lists
- Layout-triggering animations (`width`, `height`, `padding`, `margin`) instead of `transform`/`opacity`
- Idle looping animations or decorative motion on non-interactive elements
- Inconsistent easing — mixing random cubic-bezier values instead of using the three named curves

## 13. Immediate Cleanup Priorities

Based on current code and the Figma reference:

1. Normalize workspace/page width rules so `overview` uses the same full-width frame as other workspace pages.
2. Replace one-off raw hex usage in workspace pages with shared semantic tokens.
3. Collapse workspace typography onto four sizes: 20, 14, 12, 11. Remove all other font sizes.
4. Align `packages/web-ui/src/theme.ts` and website CSS variables to the same accent and neutral palette.
5. Formalize overlay, input, disabled, and state-feedback tokens so dialogs, menus, and forms stop inventing local dark grays.
6. Formalize chart tokens so reports and overview visualizations stop hardcoding accent/plum variants per file.
7. Refactor `overview` to reuse the same card, heading, spacing, and content-width conventions as profile/settings/reports instead of bespoke mini-dashboard styling.
8. Implement depth tokens (`--track-depth-*`) in `tokens.css` and apply 2.5D press-down behavior to all buttons.
9. Implement motion tokens (`--ease-*`, `--duration-*`) in `tokens.css` and replace ad-hoc transition values.
10. Add card hover-lift behavior to clickable card variants (project cards, report tiles).
