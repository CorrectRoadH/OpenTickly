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

- 前端：`React + Vite+ + Tailwind CSS 4`
- 后端：`Go`
- 数据库：`PostgreSQL`
- PostgreSQL schema 管理：`pgschema`
- 缓存与短时状态：`Redis`
- 文件存储：`PostgreSQL Blob`
- 部署：`Railway` / `Docker Compose`

说明：

- 前端统一使用 `React + Vite+ + Tailwind CSS 4`，承担完整 Web UI 与管理后台。
- `Tailwind CSS 4` 是正式前端栈的一部分，不是可选偏好；它负责页面布局、间距、栅格和通用 utility styling。
- 基于 `baseui` 的组件能力仍保留在前端专题架构中，由 `styletron` 负责其 theme 与 override 样式引擎能力。
- 后端以 Go 实现，首版采用单个 API 进程承载同步请求与必要后台任务，不拆独立 worker。
- PostgreSQL schema 以 `pgschema` 管理的声明式 desired-state SQL 作为唯一真相源，不再长期并行维护第二套 schema 工作流。
- 文件存储首版不引入对象存储，统一通过 PostgreSQL Blob 实现附件、导出物和品牌资源存储。

## 2.1 术语收口

本文档不再把 `runtime` 当作泛化词使用。涉及不同语义时，固定写成以下术语：

- 启动路径：进程如何启动，例如根目录执行 `air`
- 启动输入：`PORT`、`DATABASE_URL`、`REDIS_URL` 这类启动所需 env
- 进程结构：单 Go 进程、是否拆独立 `website` 容器、是否拆 worker
- 装配边界：`bootstrap` / `http` / `platform` 如何把依赖组起来
- 异步执行链路：job runner、webhook 投递、report projector、import continuation
- 真实后端验证：浏览器走真路由、真后端、真数据库/依赖的 page flow 或 e2e

本地开发与自托管的默认命令也固定写明，不再用含混术语代替：

```bash
# source-based local development
vp run website#dev
air

# self-hosted smoke / release-style verification
docker compose up -d postgres redis
pgschema plan --file apps/backend/internal/platform/schema/schema.sql
pgschema apply --file apps/backend/internal/platform/schema/schema.sql
docker compose up -d --build opentoggl
```

## 3. 设计原则

### 3.1 一套产品，不分叉

- Railway 版与 Docker Compose 自部署版共享同一套领域模型、API 契约和 Web 功能面。
- 差异只允许出现在部署方式、环境变量和运维手段上。

### 3.1.1 本地开发与自托管交付分离

- 本地开发默认采用源码直启：前端与后端分别从仓库根目录启动（`vp run website#dev` + `air`）。
- 本地开发前端由 `Vite` dev server 提供，浏览器请求通过 Vite proxy 转发到 Go API；默认代理目标为 `OPENTOGGL_WEB_PROXY_TARGET`，未设置时指向 `http://127.0.0.1:8080`。
- 后端本地开发统一通过根级 `.air.toml` 进行热重载；`air` 只用于本地源码开发，CI、生产构建与 self-hosted 发布路径不依赖 `air`。
- `docker compose` 属于 self-hosted 交付、部署演练和发布态 smoke 验证路径，不是默认本地开发路径。
- 本地开发所需环境变量统一放在仓库根目录，避免按应用分散配置。
- 本地开发 env 文件约定也统一收口在仓库根目录，例如 `.env.example`、`.env.local`。
- `.env.local` 是源码本地开发的必需输入；`.env.local.example` 仅用于拷贝生成本机配置。
- 后端源码开发使用标准启动 env：`PORT`、`DATABASE_URL`、`REDIS_URL`；这些连接/监听边界不再使用项目私有别名。
- 后端本地启动不得依赖内置 datasource fallback。若关键 env 缺失，进程必须直接失败，而不是退回内存实现或伪默认配置。
- 本地开发的 Go 后端默认应连接真实 PostgreSQL 与 Redis；“能启动一个假后端/占位路径”不构成后端可工作。

### 3.2 单体优先，不先拆多进程部署形态

- 首版只保留 `apps/backend` 一个 Go 进程。
- Web 前端仍作为 `apps/website` 独立构建，但 self-hosted 交付默认采用“先构建前端静态产物，再嵌入 Go 后端二进制并由同一进程提供页面与 API”的单体交付形态。
- `reports`、`webhooks`、`import` 在代码结构上隔离，但仍运行在同一个 Go 后端进程内。
- 不允许为了“看起来先进”而在一开始引入 worker、队列系统或多服务调用复杂度。
- self-hosted 默认不要求额外引入独立 `website` 容器或 Nginx 进程；如部署环境已有现成入口层，它只承担 TLS / ingress 职责，不改变默认交付形态。

### 3.3 单一事务真相源，读写分离按需演进

- 事务写模型以 PostgreSQL 为核心真相源。
- PostgreSQL 结构定义以仓库内 `pgschema` desired-state SQL 为准；对 live database 的结构收口必须通过 `pgschema plan/apply` 执行。
- 报表、导出、Webhook、搜索等高读取或异步能力可以通过投影、任务表和缓存解耦。
- 首版允许从单库起步，但必须保留向独立读模型演进的边界。
- 源码本地开发默认也遵守同一真相源原则：事务写路径不能以内存 store 或占位后端路径替代 PostgreSQL。

### 3.4 公开合同优先于内部实现

- 外部 API 的路径、参数、错误语义、鉴权方式、限流表达和请求处理/交付行为优先。
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
├── Webhooks Delivery
├── Import Service
└── In-Process Background Jobs

State Layer
├── PostgreSQL (OLTP + blob store + job records, schema managed by pgschema)
├── Redis
└── Analytics Read Model

External Integrations
├── Email / notification provider
├── Payment provider
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
- 正式启动链路固定为：建立数据库连接 -> 用 `pgschema` 使 live schema 收口到仓库 desired state -> 执行实例初始化/bootstrap guard -> 再暴露 readiness。

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
- `validate`、`ping`、`limits`、`status` 不能绕开正式投递链路。

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
  website/
  backend/
    main.go
    internal/
      bootstrap/
      http/
      web/
      identity/
      tenant/
      membership/
      catalog/
      tracking/
      governance/
      reports/
      webhooks/
      billing/
      importing/
      platform/

packages/
  web-ui/
  shared-contracts/
```

说明：

- `Organization` 与 `Workspace` 是公开产品资源和租户实体，但代码层面统一归 `tenant`。
- `governance` 是正式顶层模块，不应隐在 `organization` 或 `workspace` 下。
- `platform` 是共享技术底座，不是业务上下文。
- 具体目录与依赖规则以后续 `docs/core/codebase-structure.md` 为准。

建议职责：

- `apps/website`：当前 React Web UI 主应用；在正式重构边界前，它是前端目录事实来源。
- `apps/backend`：Go 后端应用入口，承载由 `toggl-*` OpenAPI 驱动的外部公开 API、Web 管理接口与进程内后台任务。
- `packages/web-ui`：前端可复用 UI、hooks、前端工具函数。
- `packages/shared-contracts`：少量前后端共享的非外部公开 API 层公共类型。
- `apps/backend/internal/<context>`：后端按业务上下文拆分的模块代码。
- `apps/backend/internal/platform`：数据库、认证、缓存、文件存储、后台任务、可观测性等共享基础设施。

约束：

- 外部公开 API 与 Web UI 必须共享同一套领域模型和权限语义。
- 不能让 Web UI 直接绕过应用层写数据库。
- 不能让后端退化为按技术层平铺的 `controllers/services/repositories` 大目录。

## 9. API 分层策略

### 9.1 External Public API Layer

职责：

- 暴露由 `toggl-*` OpenAPI 定义的外部公开路径和响应结构
- 承担对应公开鉴权、错误语义、分页和 headers

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
- 公开定义中需要稳定存在的业务规则

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

- Railway Web Service: `opentoggl`（单 Go 进程，提供 API 与嵌入后的 Web 资源）
- Railway PostgreSQL
- Redis

说明：

- 如果当前仓库或历史部署仍有 `website` 独立进程/服务，应视为待清理的实现漂移，而非目标拓扑。

特点：

- 尽量减少进程与容器数量。
- 适合首版快速发布和持续迭代。

### 13.2 Docker Compose 自部署

最小可用拓扑：

- `opentoggl`
- `postgres`
- `redis`

其中：

- `opentoggl` 是单个 Go 进程容器，同时提供 Web UI 静态资源、SPA 路由回退和 HTTP API。
- `apps/website` 仍是源码开发入口，但不是 self-hosted 发布态必须单独部署的服务。

特点：

- 单机可运行
- 自托管默认以单应用镜像交付，而不是前后端双镜像
- 可接受通过单个 Go 后端进程 + PostgreSQL 起步
- 对外功能面不裁剪

## 14. 当前仓库状态与下一步落地

当前仓库状态：

- 已有产品定义、领域模型、架构与专题 PRD 文档。
- 已收录 Toggl OpenAPI 与官方文档镜像。
- 代码仍处于 Vite+ monorepo starter 阶段，尚未开始业务实现。

建议的落地顺序：

1. 先确定 monorepo 模块边界与目录结构。
2. 搭建 `apps/backend`，并把当前 `apps/website` 演进为正式 Web 主入口。
3. 落第一版 `domain`、`application`、`auth`、`db`、`filestore`、`jobs` 基础层。
4. 优先打通 Identity、Workspace、Projects、Time Entries 的主写路径。
5. 引入任务表和进程内 job runner，再扩展 reports/webhooks/import。
6. 最后补齐更完整的运营面与低频能力。

## 15. 与其他文档的关系

- `docs/core/product-definition.md`：定义产品目标，以及 OpenAPI / Figma / PRD 的依赖关系。
- `docs/core/codebase-structure.md`：定义前后端目录结构、依赖方向和模块规则。
- `docs/core/frontend-architecture.md`：定义前端状态管理、组件边界与页面实现结构。
- `docs/core/backend-architecture.md`：定义后端模块内部结构、组合层与异步执行链路规则。
- `docs/core/testing-strategy.md`：定义测试矩阵、目录与最低发布门槛。
- `docs/core/domain-model.md`：定义领域对象、上下文、聚合与不变量。
- `openapi/*.json`：定义 API 公开合同强约束输入。
- Figma：定义 UI 公开定义强约束输入。
- `docs/product/*.md`：补充 OpenAPI 与 Figma 未完整表达的功能细节。

本文档负责把这些文档收束为一份统一的工程实现蓝图。
