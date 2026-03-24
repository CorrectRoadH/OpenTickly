# OpenToggl Design System

This document is the visual source of truth for the website shell until a fuller token system is implemented in code.

Primary references:

- Figma `profile`, node `10:14814`
- Shared left nav inside the same Figma section, node `10:14627`
- Figma variables returned by MCP for the selected screen

This document is intentionally opinionated. If current code differs, the code should move toward these rules instead of inventing local page-specific styles.

## 1. Core Visual Direction

OpenToggl shell uses a dense dark enterprise UI:

- Black-first shell chrome
- Charcoal content surfaces
- White primary text
- Gray secondary text
- Magenta/pink accent for active state and interactive emphasis
- Tight, compact typography rather than oversized dashboard marketing styling

The product should feel like Toggl Track's operational workspace, not a separate dark theme experiment.

## 2. Color Roles

Use roles first. Raw hex values are implementation detail.

### Shell and Surface

- `shell/nav`: `#0D0D0D`
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
- Active shell items should use tinted dark-plum backgrounds with light pink text, not plain gray fills.

## 3. Typography

### Font Family

- Primary font: `Inter`
- Do not mix in alternate UI fonts for shell pages.

### Type Scale

The shell uses a compact scale. Most pages in the current code are too inconsistent because they mix many one-off values.

- `page-title`: 21px, medium to semibold, line-height about 30px
- `section-title`: 16px, semibold, line-height about 23px
- `body`: 14px, medium or regular, line-height 20px
- `supporting-body`: 12px, regular to medium, line-height 16px
- `caption`: 11px, medium, line-height 16px
- `caps-label`: 11px, semibold, uppercase, letter-spacing about `0.04em`
- `micro-label`: 8px to 9px uppercase only for rail/profile micro labels and very small shell metadata

Rules:

- Default body text across settings/profile/shell cards is 14px.
- Do not use 18px to 22px text for ordinary card headers unless Figma explicitly shows a page title.
- Avoid mixing `text-[10px]`, `text-[13px]`, `text-[15px]`, `text-[18px]`, `text-[20px]`, `text-[22px]` in the same page unless the exact role requires it.
- Prefer a small set of named roles over arbitrary per-page pixel values.

## 4. Shell Layout

### Left Navigation

- Total left nav width: `226px`
- Icon rail: `47px`
- Main nav panel: `179px`

This is already reflected in Figma and should stay stable across shell pages.

### Main Content Frame

From the selected Figma screen:

- Content region width beside nav: `1384px` in the captured frame
- Standard inner page gutter: `20px`
- Standard card content gutter: `20px`
- Standard shell top header row height: about `66px`

Rules:

- Shell pages should be fluid inside the main content region.
- Do not cap shell page roots to narrow widths like `654px`.
- If a table, chart, or calendar needs more room, keep overflow local to that module, not the entire page.
- The main content area should read as a full-width workspace with inner gutters, not as a centered marketing column.

## 5. Card System

Profile/settings Figma establishes the canonical card pattern for shell pages:

- Card background: same dark surface family as page background, slightly separated by border
- Border: `#3A3A3A`
- Corners: subtle rounding, not oversized pill rounding
- Header padding: roughly `20px`
- Body padding: roughly `20px`
- Title + subtitle stack is the default card header pattern

Rules:

- Dashboard cards, settings cards, and shell information panels should use the same card chassis unless the product explicitly needs a chart/report variant.
- Avoid introducing a separate dashboard-only geometry with tiny unreadable typography and compressed paddings.

## 6. Controls

### Buttons

Default shell buttons in Figma are compact and restrained:

- Height: `36px`
- Text size: 12px to 14px depending role
- Border-first styling is common on settings/profile screens
- Filled accent buttons should be reserved for clear primary actions

### Inputs and Selects

- Height: `36px` to `39px`
- Background: dark surface
- Border: `#3A3A3A`
- Text: white or secondary gray
- Labels: 11px to 12px compact labels above field

### Checkboxes and Small Toggles

- Use accent magenta for selected state
- Keep surrounding label copy in 14px/16px compact body scale

## 7. Page Family Rules

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

Shared shell expectations:

- Same left nav width and styling
- Same page gutter system
- Same title hierarchy
- Same compact body scale
- Same dark card language
- Same accent family

### Overview-Specific Rule

`overview` is not allowed to become a narrow custom dashboard column. It should use the same full-width shell frame as other pages and only constrain overflow inside charts or specialized widgets.

## 8. Token Mapping For Implementation

The current app already has partial token names in [styles.css](/Users/opentoggl-ci/Code/opentoggl/apps/website/src/app/styles.css) and [theme.ts](/Users/opentoggl-ci/Code/opentoggl/packages/web-ui/src/theme.ts). These should converge toward the Figma roles above.

Recommended canonical mapping:

- `--track-panel`: `#0D0D0D`
- `--track-surface`: `#1B1B1B`
- `--track-surface-muted`: `#232323`
- `--track-surface-raised`: `#242424`
- `--track-border`: `#3A3A3A`
- `--track-text`: `#FFFFFF`
- `--track-text-muted`: `#A4A4A4`
- `--track-text-soft`: `#999999`
- `--track-accent`: `#E57BD9`
- `--track-accent-text`: `#F7D0F0`

`--track-canvas` should stop drifting away from the shell system. It should align with the page background family instead of using a disconnected gray.

## 9. Anti-Patterns

Do not introduce these patterns in shell pages:

- Narrow centered content columns for core shell screens
- Arbitrary page-specific color palettes
- Repeated raw hex values instead of shared roles
- Large typography jumps between sibling pages
- Tiny 8px to 10px body copy used as the primary reading size
- Cards that invent their own border, radius, and padding system
- Accent usage that turns the UI into bright pink-on-black decoration instead of restrained enterprise emphasis

## 10. Immediate Cleanup Priorities

Based on current code and the Figma reference:

1. Normalize shell/page width rules so `overview` uses the same full-width frame as other shell pages.
2. Replace one-off raw hex usage in shell pages with shared semantic tokens.
3. Collapse shell typography onto a small named scale centered around 21, 16, 14, 12, and 11.
4. Align `packages/web-ui/src/theme.ts` and website CSS variables to the same accent and neutral palette.
5. Refactor `overview` to reuse the same card, heading, spacing, and content-width conventions as profile/settings/reports instead of bespoke mini-dashboard styling.
