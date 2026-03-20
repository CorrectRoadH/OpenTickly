# OpenToggl Docs / Code Drift Audit

日期：2026-03-20

## 目的

整理当前仓库实现与 `docs/` / `openapi/` 主线定义之间的偏移，并记录当前实际开发、检查、测试 cycle。

本文件是审计记录，不替代权威产品和架构文档。

## 审计范围

- `docs/core/*.md`
- `docs/product/*.md`
- `openapi/*.json`
- `apps/website`
- `apps/api`
- `backend/internal/*`
- 根级脚本与当前可执行验证命令

## 总结

当前仓库与文档存在明显偏移，但需要区分两类：

1. 已在文档中承认的 starter / wave 状态
2. 如果按产品文档的首版目标态衡量，当前实现尚未覆盖的产品面和测试面

简化判断：

- 结构方向大体对齐
- 产品覆盖面远未对齐
- 默认门禁未收敛到“一键全绿”

## 主要结论

### 1. 仓库结构方向基本对齐

以下方面与架构文档基本一致：

- 前端位于 `apps/website`
- API 进程入口位于 `apps/api`
- 共享包位于 `packages/*`
- 后端业务模块主体位于 `backend/internal/*`
- 前端目录采用 `app/routes/pages/features/entities/shared`

对应文档：

- `docs/core/architecture-overview.md`
- `docs/core/codebase-structure.md`
- `docs/core/frontend-architecture.md`
- `docs/core/backend-architecture.md`

证据：

- `apps/website/src/*`
- `apps/api/internal/*`
- `backend/internal/*`

### 2. 产品覆盖面与文档目标态存在大偏移

文档要求首版完整覆盖：

- `Track API v9`
- `Reports API v3`
- `Webhooks API v1`
- 对应完整 Web UI
- importing
- instance-admin

当前实际落地更接近：

- identity / session
- profile / preferences
- workspace / organization settings
- 一个 workspace shell
- 一个占位性质的 reports 页面

尚未看到成体系实现的产品面：

- tracking 主体能力
- running timer
- projects / clients / tasks / tags
- approvals / expenses / favorites / goals / reminders
- reports 正式查询与导出能力
- webhooks 产品面
- importing 产品面
- instance-admin 产品面

### 3. `apps/api` 仍是过渡态 Wave runtime

文档目标态要求 `apps/api` 负责组合真实模块服务。

当前 `apps/api/internal/bootstrap/app.go` 直接接入的是 `Wave1WebHandlers`，不是完整模块编排后的目标态 runtime：

- `apps/api/internal/bootstrap/app.go`
- `apps/api/internal/bootstrap/wave1_web_runtime.go`
- `apps/api/internal/http/wave1_web_handlers.go`
- `apps/api/internal/http/wave1_web_tenant_handlers.go`

这些实现以 in-memory shell / auth / tenant settings 为主，明显还是过渡切片，不是完整产品面。

### 4. 后端模块切分正确，但实现覆盖率低

`backend/internal` 已按文档定义的上下文拆分：

- `identity`
- `tenant`
- `membership`
- `catalog`
- `tracking`
- `governance`
- `reports`
- `webhooks`
- `billing`
- `importing`

其中当前有较多真实代码和测试的主要是：

- `identity`
- `tenant`
- `billing`

其余多个上下文仍大量停留在 `.keep` / 空目录 / 结构占位。

结论：

- 模块边界方向对
- 功能实现面严重落后于产品文档

### 5. 前端分层和状态组织比产品完成度更接近文档

前端已能看到相对清晰的结构：

- `app/`
- `routes/`
- `pages/`
- `features/`
- `entities/`
- `shared/*`

Query、router、form state 的组织方式也大体符合 `frontend-architecture.md` 的要求。

但产品页面覆盖面明显不够，目前路由只覆盖：

- `/login`
- `/register`
- `/profile`
- `/workspaces/$workspaceId`
- `/workspaces/$workspaceId/reports`
- `/workspaces/$workspaceId/settings`
- `/organizations/$organizationId/settings`

与 PRD 要求相比，缺少大量 tracking / reports / webhooks / importing 页面族。

### 6. 测试策略与当前真实门禁不一致

测试文档要求：

- 测试本身是主要验收机制
- 默认开发门禁就是全量测试门禁
- e2e 是日常全量门禁的一部分
- contract / golden / frontend page flow / backend integration 都需要完整存在

当前实际状态：

- 有一定数量的 Go domain / integration test
- 有前端 unit / feature / page flow test
- 有 `apps/api/tests/compat` 和 `apps/api/tests/golden`
- 有 Playwright e2e

但默认一键门禁还不是全绿，原因至少包括：

- 根级 `vp check` 当前失败
- 根级 `test` 当前因 Playwright web server 启动失败而失败
- 测试覆盖面仍主要集中在 wave1 identity / tenant shell

## 细项偏移

### A. 产品面偏移

#### Identity / Tenant

对齐程度：部分对齐

已落地：

- 注册
- 登录
- 会话 bootstrap
- profile
- preferences
- organization settings
- workspace settings

缺口：

- 用户生命周期的停用 / 删除语义未形成完整实现面
- API token 管理未形成完整 Web 产品面
- organization / workspace CRUD 和成员管理远未完整
- logo / avatar 只有入口文案，没有正式能力

#### Tracking

对齐程度：严重偏移

文档要求 tracking 是首版正式产品面，且要完整兼容 `Track API v9`。

当前未看到完整实现：

- time entries
- running timer
- timer 视图族
- projects / clients / tasks / tags
- approvals / expenses
- favorites / goals / reminders

#### Reports

对齐程度：严重偏移

当前只有 `WorkspaceReportsPage` 的壳层页面，没有看到：

- detailed / summary / weekly / insights
- saved reports
- shared reports
- export
- reports filters / search 套件

#### Webhooks

对齐程度：严重偏移

PRD 明确要求完整产品面和 Web 入口，当前未见相应页面、模块实现和 runtime 体系。

#### Importing / Instance Admin

对齐程度：严重偏移

文档已把 importing 和 instance-admin 列为正式产品面，但当前仓库实现几乎还没有对应产品层落地。

### B. 架构偏移

#### `apps/api` 与目标态 bootstrap

目标态：

- 由 `apps/api/internal/bootstrap` 装配真实模块
- transport 只承载边界
- compat / web API 各走明确合同来源

当前状态：

- `Wave1WebHandlers` 仍承担了大量过渡态 HTTP 行为
- web runtime 更多是 wave slice，不是完整目标态 composition

#### OpenAPI 生成工作流

文档倾向 generation-first，尤其 compat API 应尽量由 OpenAPI 生成边界。

当前可见情况：

- `apps/api/scripts/generate-openapi-test-artifacts.mjs`
- `packages/shared-contracts/scripts/generate-shared-contracts.mjs`

说明合同产物和测试清单已有生成环节。

但当前 compat / web transport 仍存在大量手写 route / handler 过渡代码，距离文档描述的生成优先策略还有距离。

### C. 测试偏移

#### 文档中的目标测试矩阵

文档要求至少包括：

- Domain Unit
- Application Integration
- Transport Contract
- Async Runtime
- Frontend Unit
- Frontend Feature
- Frontend Page Flow
- E2E
- Compatibility Golden

#### 当前可见状态

已有：

- Go domain tests
- Go application integration tests
- `apps/api/tests/compat`
- `apps/api/tests/golden`
- frontend component / page-flow tests
- Playwright e2e

明显不足：

- async runtime 测试面不完整
- 多数产品故事没有形成跨层验收链
- tracking / reports / webhooks 对应测试矩阵远未铺开

## 当前开发 / 检查 / 测试 Cycle

### 1. 开发

根级脚本：

- `dev`: `vp run website#dev`

前端 dev server 会代理：

- `/web/v1`
- `/healthz`

到：

- `OPENTOGGL_WEB_PROXY_TARGET`
- 默认 `http://127.0.0.1:8080`

因此当前实际开发模式更像：

1. 起 Go API 到 `:8080`
2. 起 website dev server
3. 前端通过代理访问 web API

### 2. 检查

根级脚本：

- `check`: `vp check && vp run check -r`

实测结果：

- 当前失败

失败原因不是主业务类型报错，而是大量格式化问题，涉及：

- `.agent/*`
- `.claude/worktrees/*`
- 若干测试和配置文件

这说明当前根级 `check` 还没有被收敛成稳定可通过的默认门禁。

### 3. 测试

根级脚本：

- `test`: `vp run test -r`

实测结果拆分如下：

- `go test ./backend/...`：通过
- workspace 内 Vitest / contract / golden：通过
- `apps/website` Playwright：失败

Playwright 失败原因：

- 启动 web server 时尝试监听 `127.0.0.1:4173`
- 当前运行环境报 `EPERM`

这次审计环境下无法证明是业务用例失败，更像本地/沙箱监听限制导致。

### 4. 构建

根级脚本：

- `build`: `vp run build -r`

实测结果：

- 通过

附加信号：

- `apps/website` 构建产物存在 chunk 大于 `500 kB` 的 warning

### 5. 一键 ready

根级脚本：

- `ready`: `vp fmt && vp lint && vp run test -r && vp run build -r`

当前判断：

- 不是稳定全绿

至少会被以下问题阻断：

- `check/fmt` 未收敛
- `test` 中 Playwright web server 启动失败

## 实测命令记录

本次审计实际执行过的关键命令：

```bash
go test ./backend/...
pnpm test
vp check
vp run build -r
```

结果摘要：

- `go test ./backend/...` 通过
- 根级 `test` 失败，主要卡在 `apps/website` Playwright web server 启动
- `vp check` 失败，主要卡在格式化问题
- `vp run build -r` 通过

## 当前判断

如果用一句话概括当前仓库状态：

这是一个“与文档方向大体一致、但产品实现和默认门禁尚未收敛”的 starter / wave 过渡仓库，而不是已经与 `docs/` 全面对齐的可交付实现。

## 建议的后续动作

优先级建议：

1. 先收敛默认门禁，让 `check` / `test` / `build` 至少在仓库预期环境中稳定执行
2. 以 `tracking -> reports -> webhooks -> importing` 的顺序补齐正式产品面
3. 把 `apps/api` 从 wave runtime 继续推进到文档定义的真实模块组合层
4. 把测试从“有若干局部测试”推进到“按产品故事的跨层验收链”

