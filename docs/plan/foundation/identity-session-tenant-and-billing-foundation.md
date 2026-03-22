# Identity, Session, Tenant, and Billing Foundation

**Status:** In progress

**Goal:** Establish login state, current user, tenant objects, shared app shell, and billing as the formal source of feature gate and quota facts.

## Why This Plan Exists

This plan exists because identity, tenant, session, and billing facts are prerequisite truths for almost every later product surface. The plan stays open because the current runtime and transport layers still do not fully reflect the documented source-of-truth rules.

## Scope

- Register, login, logout, API token, current user, profile, and preferences
- Organization and workspace CRUD plus settings and branding assets
- Billing core facts: plan, subscription, customer, quota, feature gate
- Shared shell, login/register, profile, settings, organization/workspace management

## Development Constraints

- [identity-and-tenant.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/identity-and-tenant.md)
- [billing-and-subscription.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/billing-and-subscription.md)
- [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md)
- [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)
- [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- [testing-strategy.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/testing-strategy.md)

## Depends On

- [Monorepo and Generation Foundation](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/monorepo-and-generation-foundation.md)
- [Local Development Baseline](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/local-development-baseline.md)

## Current Status

- Identity backend slice completed
- Tenant backend slice completed
- Billing foundation first slice completed
- Identity and tenant Web slice completed
- Overall plan remains open because runtime and transport areas still drift from the exit rule

## Remaining Gaps

- Billing must be the formal source for capability, quota, and gate decisions rather than transport-level hardcoding
- The current runtime assembly still contains fake runtime coupling that conflicts with the exit rule
- Logout and route-level auth/session closure are tracked in [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md)

## Current Drift Against Docs

- Billing facts still leak through transport/runtime hardcoding even though [billing-and-subscription.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/billing-and-subscription.md) and [architecture-overview.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/architecture-overview.md) require billing to own gate/quota truth
- Runtime assembly still depends on fake or transitional runtime paths that conflict with [backend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/backend-architecture.md)
- Logout and route-level session closure remain incomplete relative to [identity-and-tenant.md](/Users/opentoggl-ci/Code/opentoggl/docs/product/identity-and-tenant.md) and [frontend-architecture.md](/Users/opentoggl-ci/Code/opentoggl/docs/core/frontend-architecture.md)

## Testing Story Coverage Status (Stage 2)

Coverage source of truth:

- [bdd-user-stories.md](/Users/opentoggl-ci/Code/opentoggl/docs/testing/bdd-user-stories.md)
- [testing-story-coverage.md](/Users/opentoggl-ci/Code/opentoggl/docs/plan/cross-cutting/testing-story-coverage.md)

Covered stories (full or partial evidence already exists):

- `4` 用户登录并进入正确的工作区
- `4A` 用户管理账户资料、个人偏好与 API token
- `5A` 管理员管理 organization、workspace 与当前工作上下文
- `5` 管理员管理工作区设置
- `13` 管理员管理套餐、订阅和配额
- `14` 管理员在降级后处理超限状态

Missing stories in this plan scope:

- `4B` 用户主动退出并结束当前会话 still misses formal page-flow and direct E2E closure
- `13A` 管理员管理 customer、invoice 与 payment 相关状态 remains missing in formal Web + test layers

Approved deferrals/gaps:

- `4B` page-flow/E2E closure is owned by [One-Way Structure Governance](/Users/opentoggl-ci/Code/opentoggl/docs/plan/foundation/one-way-structure-governance.md) per route-level auth/session guard scope
- Commercial billing surfaces for `13/13A/14` are owned by [Billing Commercial Views and Invoices](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/billing-commercial-views-and-invoices.md)

Page-flow / E2E gaps to keep visible:

- `4B` logout route-level flow lacks dedicated page-flow and direct E2E closure
- `4A` profile still lacks direct (non-indirect) E2E coverage
- `5` settings still lacks dedicated E2E coverage
- billing stories `13/13A/14` still lack billing-page page-flow and E2E closure

## Acceptance Criteria

- A user can register or log in and enter a workspace
- Current user, workspace settings, and organization settings are readable and writable through API and Web
- Deactivated-user behavior is enforced consistently
- Billing provides the formal gate/quota/capability facts used by runtime and UI
- Shared shell, profile, and settings are formal product surfaces rather than placeholder structures
- Story-to-test mapping exists for this plan's behavior

## Evidence Required

- Page-flow coverage for auth, shell, profile, and settings
- Contract coverage for identity and tenant surfaces
- Integration coverage for identity, tenant, and billing application services
- At least one real-runtime login-to-shell verification chain
