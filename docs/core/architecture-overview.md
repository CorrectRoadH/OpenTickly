# OpenToggl 技术架构

本文档定义 `OpenToggl` 的目标技术架构，回答四个问题：

1. 如何用一套系统同时承载 Toggl 当前公开 API、Web UI 与导入能力。
2. 如何在 Railway 部署与 Docker Compose 自部署之间保持同一套公开契约与功能面。
3. 前后端采用什么技术栈，以及代码按什么结构组织。
4. 如何把当前仓库从脚手架逐步演进为可交付实现。

本文档是实现蓝图，不替代 OpenAPI、Figma 与对应 PRD。关于具体公开边界、页面语义、功能细节和领域对象定义，分别以上游输入与 `docs/` 下对应文档为准。

## 1. 架构目标

`OpenToggl` 的技术架构必须同时满足以下目标：

- 对外完整承载 `Track API v9`、`Reports API v3`、`Webhooks API v1`。
- 提供覆盖全部公开能力的 Web UI，而不是只做 API 表面。
- 保持公开 OpenAPI、CLI 与 skill 接入对 AI/自动化友好，但不单独设计独立的 AI API 产品面。
- 同时支持 Railway 托管部署与 Docker Compose 自部署，且两者公开产品面一致。
- 支持导入 Toggl 数据，并尽可能保留原始 ID。
- 用可验证的方式处理报表、Webhook、导出、审计、配额和最终一致性。

## 2. 技术栈

- 前端：`React + Vite+`
- 后端：`Go`
- 数据库：`PostgreSQL`
- 缓存与短时状态：`Redis`
- 文件存储：`PostgreSQL Blob`
- 部署：`Railway` / `Docker Compose`

说明：

- 前端统一使用 `React + Vite+`，承担完整 Web UI 与管理后台。
- 后端以 Go 实现，首版采用单个 API 进程承载同步请求与必要后台任务，不拆独立 worker。
- 文件存储首版不引入对象存储，统一通过 PostgreSQL Blob 实现附件、导出物和品牌资源存储。

## 3. 设计原则

### 3.1 一套产品，不分叉

- Railway 版与 Docker Compose 自部署版共享同一套领域模型、API 契约和 Web 功能面。
- 差异只允许出现在部署方式、环境变量和运维手段上。

### 3.2 单体优先，不先拆多进程运行时

- 首版运行时只保留 `api` 一个 Go 进程和 `web` 一个前端应用。
- `reports`、`webhooks`、`import` 在代码结构上隔离，但仍运行在同一个 Go API 进程内。
- 不允许为了“看起来先进”而在一开始引入 worker、队列系统或多服务调用复杂度。

### 3.3 单一事务真相源，读写分离按需演进

- 事务写模型以 PostgreSQL 为核心真相源。
- 报表、导出、Webhook、搜索等高读取或异步能力可以通过投影、任务表和缓存解耦。
- 首版允许从单库起步，但必须保留向独立读模型演进的边界。

### 3.4 公开合同优先于内部实现

- 外部 API 的路径、参数、错误语义、鉴权方式、限流表达和运行时行为优先。
- 内部模块命名、包结构和存储模型可以为实现效率优化，但不能破坏对外公开定义。

### 3.5 Workspace 是主业务边界，Organization 是治理边界

- 核心业务对象大多围绕 `workspace` 运转。
- `organization` 在公开产品面上通常是治理、订阅和跨 workspace 管理的主要挂载点。
- 这不等于代码结构里由 `organization` 或 `tenant` 模块拥有 billing / quota / governance 的全部业务本体。
- 代码层面应区分：
  - `tenant` 负责 organization / workspace 本身及其关联关系
  - `billing` 负责 plan / subscription / invoice / customer / 商业配额
  - `governance` 负责 API quota / audit / retention / status

### 3.6 代码结构采用有明确规则的领域边界 + Hexagonal 组合

这里不接受只写一句“DDD-lite”。

本项目采用的具体规则是：

- 代码先按业务上下文拆模块，如 `identity`、`tracking`、`reports`、`webhooks`。
- 每个模块内部再分 `domain`、`application`、`infra`、`transport`。
- `transport` 负责 HTTP 输入输出和公开 DTO。
- `application` 负责用例编排、事务、授权和调用顺序。
- `domain` 负责实体、不变量和领域规则。
- `infra` 负责 Postgres、Redis、外部 HTTP、文件存储等实现。

这不是术语驱动的“纯 DDD”，而是一套为了控制复杂度、方便演进和测试的工程结构。

## 4. 系统上下文

```text
Clients
├── Toggl API consumers
├── OpenToggl Web App
├── AI agents / automation
└── Admin / import operators

Edge
└── Web Ingress / Railway Edge

Application Layer
├── Identity & Session
├── Core API
├── Reports API
├── Webhooks Runtime
├── Import Service
└── In-Process Background Jobs

State Layer
├── PostgreSQL (OLTP + blob store + job records)
├── Redis
└── Analytics Read Model

External Integrations
├── Email / notification provider
├── Payment provider
├── Calendar providers
└── User webhook endpoints
```

## 5. 逻辑模块划分

### 5.1 Identity & Session

负责：

- 注册、登录、登出
- `Basic auth(email:password)` 入口
- `Basic auth(api_token:api_token)` 入口
- session cookie 入口
- API token 生命周期
- 当前用户与偏好读取

### 5.2 Core API

负责：

- Track API v9 主体能力
- organizations / workspaces / memberships
- clients / projects / tasks / tags
- time entries / running timer
- approvals / expenses / goals / favorites / reminders
- audit / quota / meta / status
- billing 表面中的事务型写接口

说明：

- `Core API` 是主写模型入口。
- 每次成功变更都要在同事务内写业务数据和必要的后台 job record。

### 5.3 Reports API

负责：

- Reports API v3 的查询、导出、saved/shared reports
- detailed / summary / weekly / trends / profitability / insights

说明：

- Reports 在逻辑上是独立读模型，不应退化为每次在线临时联表。
- 但首版仍运行在同一个 Go API 进程中。

### 5.4 Webhooks Runtime

负责：

- Webhook subscription CRUD
- validate / ping / limits / status
- 事件过滤、签名、投递、重试和失败治理

### 5.5 Import Service

负责：

- Toggl 导出数据导入
- 原始 ID 保留策略
- 冲突检测、部分成功回报、重试与审计

### 5.6 In-Process Background Jobs

负责：

- report projection
- webhook dispatch
- export generation
- import continuation
- import 后的 billing / quota 重新评估
- notification / cleanup / maintenance jobs

说明：

- 这些任务由 Go API 进程内部的后台 job runner 执行。
- 可以使用数据库任务表触发和恢复，不单独部署 worker。

## 6. 核心数据流

### 6.1 事务写路径

```text
Client Request
-> Web Ingress
-> Auth / Permission Check
-> Core API Command Handler
-> PostgreSQL Transaction
   -> Domain Tables
   -> Audit Records
   -> Job Records
-> Commit
-> Return Public Response
```

要求：

- 对外响应优先基于事务真相源生成。
- 公开接口的错误码、校验失败和权限拒绝必须在这里定型。

### 6.2 后台任务路径

```text
Committed Transaction
-> Job Scheduler / Job Table
-> Report Projector
-> Webhook Dispatcher
-> Cache Invalidation
-> Notification / Export Jobs
```

要求：

- 所有后台任务都要以任务 ID 或等价 job 标识做幂等。
- 失败任务必须可重试，可观测，可人工重放。

### 6.3 报表读取路径

```text
Client
-> Reports API
-> Analytics Read Model
-> Export Job (in-process)
-> PostgreSQL Blob / Download URL
```

要求：

- 报表统计口径以对应 OpenAPI、Figma 与 `docs/product/reports-and-sharing.md` 为准。
- 在线查询与异步导出共享同一套过滤与权限语义。

### 6.4 Webhook 投递路径

```text
Core Mutation
-> Internal Event / Job
-> Webhook Matcher
-> Delivery Record
-> Signed HTTP Request
-> Retry / Backoff
-> Final Status
```

要求：

- 请求签名、事件 ID、attempt log 和失败终态需要持久化。
- `validate`、`ping`、`limits`、`status` 不能绕开正式投递运行时。

## 7. 数据存储架构

### 7.1 PostgreSQL

作为事务真相源，主要保存：

- identity / session metadata
- organizations / workspaces / memberships
- clients / projects / tasks / tags
- time entries / expenses / approvals / favorites / goals
- billing 基础事实
- webhook subscriptions / delivery metadata
- import jobs / import mappings
- async job records
- audit logs

多租户策略：

- 默认逻辑多租户。
- 核心业务表携带 `organization_id`。
- workspace 级核心对象同时携带 `workspace_id`。

### 7.2 Analytics Read Model

主要保存：

- report facts
- summary / weekly aggregates
- profitability / trend projections
- saved/shared report 查询加速结构

实现建议：

- 首版可仍在 PostgreSQL 中分 schema 或分表实现。
- 后续按负载演进到独立分析库，但对外 API 不变。

### 7.3 Redis

主要用于：

- session / short-lived cache
- rate limiting
- quota counters
- idempotency keys
- temporary job state

说明：

- Redis 不是部署必须项。
- 如果首版希望进一步简化，限流、幂等和短时状态也可以先落在 PostgreSQL 中。

### 7.4 PostgreSQL Blob 文件存储

首版文件存储统一放在 PostgreSQL 中，通过 `file_blobs` 与 `file_objects` 一类表管理。

主要用于：

- expense attachments
- avatars / logos
- exported report files
- invoice / receipt artifacts
- import source archives

约束：

- 文件元数据与文件内容访问都通过统一 `filestore` 抽象，不允许业务代码直接读写 blob 表。
- Railway 部署与 Docker Compose 自部署都使用同一套语义，只是底层数据库实例不同。

## 8. 模块边界与代码组织建议

当前仓库仍是 Vite+ monorepo 脚手架，建议演进为以下结构：

```text
apps/
  web/
  api/

packages/
  web-ui/
  shared-contracts/

backend/
  internal/
    identity/
      domain/
      application/
      infra/
      transport/
    tenant/
      domain/
      application/
      infra/
      transport/
    membership/
      domain/
      application/
      infra/
      transport/
    catalog/
      domain/
      application/
      infra/
      transport/
    tracking/
      domain/
      application/
      infra/
      transport/
    reports/
      domain/
      application/
      infra/
      transport/
    webhooks/
      domain/
      application/
      infra/
      transport/
    billing/
      domain/
      application/
      infra/
      transport/
    importing/
      domain/
      application/
      infra/
      transport/
    governance/
      domain/
      application/
      infra/
      transport/
    platform/
      db/
      auth/
      cache/
      filestore/
      jobs/
      http/
      observability/
      config/
```

说明：

- `Organization` 与 `Workspace` 是公开产品资源和租户实体，但代码层面统一归 `tenant`。
- `governance` 是正式顶层模块，不应隐在 `organization` 或 `workspace` 下。
- `platform` 是共享技术底座，不是业务上下文。
- 具体目录与依赖规则以后续 `docs/core/codebase-structure.md` 为准。

建议职责：

- `apps/website`：当前 React Web UI 主应用；在正式重构边界前，它是前端目录事实来源。
- `apps/api`：Go API 入口，承载兼容 API、Web 管理接口与进程内后台任务。
- `packages/web-ui`：前端可复用 UI、hooks、前端工具函数。
- `packages/shared-contracts`：少量前后端共享的非兼容层公共类型。
- `backend/internal/<context>`：后端按业务上下文拆分的模块代码。
- `backend/internal/platform`：数据库、认证、缓存、文件存储、后台任务、可观测性等共享基础设施。

约束：

- 兼容 API 与 Web UI 必须共享同一套领域模型和权限语义。
- 不能让 Web UI 直接绕过应用层写数据库。
- 不能让后端退化为按技术层平铺的 `controllers/services/repositories` 大目录。

## 9. API 分层策略

### 9.1 External Compatibility Layer

职责：

- 暴露 Toggl 兼容路径和响应结构
- 承担兼容鉴权、错误语义、分页和 headers

要求：

- 这一层可以有 DTO / mapper，但不能承载核心业务规则。

### 9.2 Internal Application Layer

职责：

- 命令处理
- 查询编排
- 权限检查
- 事务边界
- 后台任务登记

### 9.3 Domain Layer

职责：

- 实体
- 不变量
- 生命周期约束
- 兼容语义中需要稳定存在的业务规则

### 9.4 Infrastructure Layer

职责：

- PostgreSQL / Redis / blob store / external provider adapters

## 10. 权限与多租户模型

权限模型应围绕以下对象展开：

- `OrganizationUser`
- `WorkspaceUser`
- `Group`
- `GroupMember`
- `ProjectUser`
- `ProjectGroup`

实现要求：

- 所有读写路径必须显式携带租户边界。
- 权限判断不能散落在控制器和 SQL 拼接里，必须集中在应用层策略。
- Reports、Webhook、Import 共享同一套授权语义。

## 11. 一致性模型

`OpenToggl` 不应承诺所有读面即时一致，应显式采用以下模型：

- 事务写模型强一致。
- 报表、Webhook、导出、部分状态页允许最终一致。
- API 与 Web UI 需要对这类延迟提供可解释状态，而不是隐式失败。

实现要求：

- 每类后台任务都要定义重试、恢复和人工重放策略。
- 用户可感知的重要异步流程应有 job 状态或 delivery 状态可查。

## 12. 可观测性与运维

首版就应具备以下能力：

- 结构化日志
- request / job trace id
- 审计日志
- 核心业务指标
- 后台任务积压监控
- webhook 成功率、重试率、停用率
- reports 生成耗时与失败率
- import 成功率、冲突率、回滚率

建议：

- API 请求与后台 job 使用统一 trace 关联键。
- 管理后台应最终提供最少可用的运维视图，而不是只依赖外部监控系统。

## 13. 部署拓扑

### 13.1 Railway

推荐拓扑：

- Railway Web Service: `api`
- Railway Static / Web Service: `web`
- Railway PostgreSQL
- Redis

特点：

- 尽量减少运行时组件数量。
- 适合首版快速发布和持续迭代。

### 13.2 Docker Compose 自部署

最小可用拓扑：

- `web`
- `api`
- `postgres`
- `redis`

特点：

- 单机可运行
- 可接受通过单个 Go API 进程 + PostgreSQL 起步
- 对外功能面不裁剪

## 14. 当前仓库状态与下一步落地

当前仓库状态：

- 已有产品定义、领域模型、架构与专题 PRD 文档。
- 已收录 Toggl OpenAPI 与官方文档镜像。
- 代码仍处于 Vite+ monorepo starter 阶段，尚未开始业务实现。

建议的落地顺序：

1. 先确定 monorepo 模块边界与目录结构。
2. 搭建 `apps/api`，并把当前 `apps/website` 演进为正式 Web 主入口。
3. 落第一版 `domain`、`application`、`auth`、`db`、`filestore`、`jobs` 基础层。
4. 优先打通 Identity、Workspace、Projects、Time Entries 的主写路径。
5. 引入任务表和进程内 job runner，再扩展 reports/webhooks/import。
6. 最后补齐更完整的运营面与低频能力。

## 15. 与其他文档的关系

- `docs/core/product-definition.md`：定义产品目标，以及 OpenAPI / Figma / PRD 的依赖关系。
- `docs/core/codebase-structure.md`：定义前后端目录结构、依赖方向和模块规则。
- `docs/core/frontend-architecture.md`：定义前端状态管理、组件边界与页面实现结构。
- `docs/core/backend-architecture.md`：定义后端模块内部结构、组合层与异步运行时规则。
- `docs/core/testing-strategy.md`：定义测试矩阵、目录与最低发布门槛。
- `docs/core/domain-model.md`：定义领域对象、上下文、聚合与不变量。
- `openapi/*.json`：定义 API 兼容强约束输入。
- Figma：定义 UI 兼容强约束输入。
- `docs/product/*.md`：补充 OpenAPI 与 Figma 未完整表达的功能细节。

本文档负责把这些文档收束为一份统一的工程实现蓝图。
