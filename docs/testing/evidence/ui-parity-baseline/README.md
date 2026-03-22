# Shell / Profile / Settings Parity Evidence

This evidence bundle closes the baseline chain required by `docs/plan/foundation/ui-and-figma-parity-baseline.md`:

- `PRD -> Figma (or fallback) -> implementation -> test -> screenshot`

## Baseline Surfaces

| Surface | PRD Source | Figma / Fallback Source | Implementation | Test | Screenshot |
| --- | --- | --- | --- | --- | --- |
| Shared App Shell | `docs/product/tracking.md` | Figma `left nav`, node `8:2829` | `apps/website/src/pages/shell/WorkspaceOverviewPage.tsx` and `apps/website/src/pages/shell/WorkspaceReportsPage.tsx` | `apps/website/src/pages/shell/__tests__/workspace-shell-page-flow.test.tsx` and `apps/website/e2e/shell-profile-settings-parity.spec.ts` | `docs/testing/evidence/ui-parity-baseline/shell-overview.png` |
| Profile | `docs/product/identity-and-tenant.md` | Figma `profile`, node `10:14814` | `apps/website/src/pages/profile/ProfilePage.tsx` | `apps/website/src/pages/profile/__tests__/profile-page-flow.test.tsx` and `apps/website/e2e/shell-profile-settings-parity.spec.ts` | `docs/testing/evidence/ui-parity-baseline/profile.png` |
| Settings | `docs/product/identity-and-tenant.md` | Figma `settings`, node `11:3680` | `apps/website/src/pages/settings/WorkspaceSettingsPage.tsx` and `apps/website/src/pages/settings/OrganizationSettingsPage.tsx` | `apps/website/src/pages/settings/__tests__/settings-page-flow.test.tsx` and `apps/website/e2e/shell-profile-settings-parity.spec.ts` | `docs/testing/evidence/ui-parity-baseline/settings-branding.png` |

## Shared UI Baseline Reuse

Reusable state patterns landed in:

- `packages/web-ui/src/AppSurfaceState.tsx`
- `packages/web-ui/src/AppInlineNotice.tsx`

These are the canonical loading/error/empty/success baseline for upcoming page families.

## Future Page-Family Source References

When page families expand from this baseline, use these explicit sources:

| Page Family | Source Type | Source |
| --- | --- | --- |
| Projects | Figma | `docs/product/tracking.md` -> `project list`, node `10:20028` |
| Clients | Figma | `docs/product/tracking.md` -> `client`, node `12:3281` |
| Tasks | Fallback | `docs/product/tracking.md` -> use `project page` as fallback skeleton |
| Tags | Fallback | `docs/product/tracking.md` -> use `project page` as fallback skeleton |
| Members / Groups / Permission Config | Fallback | `docs/testing/bdd-user-stories.md` current baseline -> left-nav shell fallback until dedicated Figma/source is defined |

