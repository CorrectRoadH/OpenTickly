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

### Font Family

- Primary font: `Inter`
- Do not mix in alternate UI fonts for workspace pages.

### Type Scale

The workspace uses a compact scale. Most pages in the current code are too inconsistent because they mix many one-off values.

- `page-title`: 21px, medium to semibold, line-height about 30px
- `section-title`: 16px, semibold, line-height about 23px
- `body`: 14px, medium or regular, line-height 20px
- `supporting-body`: 12px, regular to medium, line-height 16px
- `caption`: 11px, medium, line-height 16px
- `caps-label`: 11px, semibold, uppercase, letter-spacing about `0.04em`
- `micro-label`: 8px to 9px uppercase only for rail/profile micro labels and very small workspace metadata

Rules:

- Default body text across settings/profile/workspace cards is 14px.
- Do not use 18px to 22px text for ordinary card headers unless Figma explicitly shows a page title.
- Avoid mixing `text-[10px]`, `text-[13px]`, `text-[15px]`, `text-[18px]`, `text-[20px]`, `text-[22px]` in the same page unless the exact role requires it.
- Prefer a small set of named roles over arbitrary per-page pixel values.

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
- Corners: subtle rounding, not oversized pill rounding
- Header padding: roughly `20px`
- Body padding: roughly `20px`
- Title + subtitle stack is the default card header pattern

Rules:

- Dashboard cards, settings cards, and workspace information panels should use the same card chassis unless the product explicitly needs a chart/report variant.
- Avoid introducing a separate dashboard-only geometry with tiny unreadable typography and compressed paddings.

## 6. Controls

### Buttons

Default workspace buttons in Figma are compact and restrained:

- Height: `36px`
- Text size: 12px to 14px depending role
- Border-first styling is common on settings/profile screens
- Filled accent buttons should be reserved for clear primary actions

Button principles:

- Buttons are part of the workspace chrome, not decorative marketing elements.
- The default workspace button should feel compact, flat, and operational.
- Primary buttons use the accent fill sparingly and only for the clearest next action in the local area.
- Secondary buttons should usually be border-first or transparent with a workspace border, not a second competing fill color.
- If two adjacent actions have similar importance, both should default to secondary rather than forcing a fake primary.
- Button text should stay short and direct. Do not solve hierarchy problems with larger type or oversized horizontal padding.
- Rounded corners should stay subtle. Shell buttons are not pills.
- Icon usage should support the label, not replace readable text by default.
- Hover and focus states should strengthen contrast and border clarity, not introduce unrelated colors.
- Disabled buttons must look intentionally unavailable via reduced contrast and disabled text tone, not by inventing a new gray palette.
- Destructive intent should not be expressed by turning the entire workspace into a red theme; use dedicated destructive treatment only where the action is truly dangerous.

Button anti-patterns:

- Accent-filled buttons repeated across every card header
- More than one loud filled button in the same compact action group
- Page-local button colors that do not map to workspace tokens
- Oversized button radii, heights, or marketing-style shadows
- Icon-only buttons used where the action is not already obvious from context

### Inputs and Selects

- Height: `36px` to `39px`
- Background: dark surface
- Border: `#3A3A3A`
- Text: white or secondary gray
- Labels: 11px to 12px compact labels above field

### Checkboxes and Small Toggles

- Use accent magenta for selected state
- Keep surrounding label copy in 14px/16px compact body scale

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

### Page headers

- Page headers should share one canonical structure: title, optional subtitle, optional right-side action group.
- The default page header height should stay around the documented 66px workspace header rhythm.
- Header action groups should prefer compact workspace buttons and should not become ad hoc toolbars with mixed sizes.

### Inputs, menus, and dialogs

- Inputs, selects, comboboxes, and inline editors should all read as the same control family.
- Dropdowns, popovers, and dialogs should share overlay surface and overlay border roles instead of each file picking its own near-black.
- Search rows, picker panels, and context menus should look related even when their contents differ.

### Data views

- Tables, list rows, filter chips, and compact summary widgets should use one consistent density model.
- Row hover should come from shared hover roles, not custom backgrounds per page.
- Chart containers, legends, and tooltips should reuse card and overlay logic where possible instead of becoming a second UI system.

## 8. Page Family Rules

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

## 9. Token Mapping For Implementation

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

## 10. Theme Coverage Requirements

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

## 11. Anti-Patterns

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

## 12. Immediate Cleanup Priorities

Based on current code and the Figma reference:

1. Normalize workspace/page width rules so `overview` uses the same full-width frame as other workspace pages.
2. Replace one-off raw hex usage in workspace pages with shared semantic tokens.
3. Collapse workspace typography onto a small named scale centered around 21, 16, 14, 12, and 11.
4. Align `packages/web-ui/src/theme.ts` and website CSS variables to the same accent and neutral palette.
5. Formalize overlay, input, disabled, and state-feedback tokens so dialogs, menus, and forms stop inventing local dark grays.
6. Formalize chart tokens so reports and overview visualizations stop hardcoding accent/plum variants per file.
7. Refactor `overview` to reuse the same card, heading, spacing, and content-width conventions as profile/settings/reports instead of bespoke mini-dashboard styling.
