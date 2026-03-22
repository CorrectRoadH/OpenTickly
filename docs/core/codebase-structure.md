# OpenToggl 代码结构与依赖规约

本文档是 `OpenToggl` 实现结构的索引与总规约，不负责承载全部细节。

它回答三件事：

- 哪些文档分别定义前端、后端、测试规则
- 哪些结论是当前代码结构的 SSOT
- 新目录、新模块、新接口应遵守哪些单向依赖与边界

如果要写到足以直接指导实现与 code review 的细节，请继续读：

- [frontend-architecture](./frontend-architecture.md)
- [backend-architecture](./backend-architecture.md)
- [testing-strategy](./testing-strategy.md)

## 1. 本文档的职责

`codebase-structure.md` 只做以下事情：

- 定义仓库顶层结构与业务上下文边界
- 定义文档之间的权威关系
- 定义单向依赖、SSOT、跨模块协作、异步边界等总规则
- 作为前端、后端、测试结构文档的入口索引

本文档不再膨胀去重复：

- 前端状态管理与组件分层细则
- 后端 command/query、composition、job/projector 细则
- 测试矩阵、测试目录、验收分层细则

这些内容分别以对应专题文档为准。

## 2. 文档权威关系

发生冲突时，按以下顺序解释：

1. `docs/core/product-definition.md` 与对应 `docs/product/*.md`
2. `openapi/*.json` 与 Figma
3. `docs/core/domain-model.md`
4. `docs/core/architecture-overview.md`
5. 本文档与对应的前端、后端、测试专题文档
6. `docs/challenges/*`

解释规则：

- `product/` 决定用户可见行为与页面语义。
- `openapi/` 是 API 边界的直接输入来源，Figma 是 UI 边界的直接输入来源。
- `domain-model` 决定领域边界、对象归属、聚合根和关键不变量。
- `core/architecture-overview.md` 决定系统级运行时蓝图。
- 本文档与子文档决定代码如何组织、如何依赖、如何测试。
- `challenges/` 不是当前权威定义。

## 3. 结构 SSOT

关于“代码应该怎样组织”，当前 SSOT 是：

- 顶层业务上下文和依赖方向：本文档
- 前端页面、状态、组件、共享包边界：[frontend-architecture](./frontend-architecture.md)
- 后端模块、分层、用例、查询、组合层边界：[backend-architecture](./backend-architecture.md)
- 测试分层、目录、覆盖要求：[testing-strategy](./testing-strategy.md)

禁止在 `product/` 文档里发明实现结构。
禁止在 `openapi/` 之外重复手写外部公开 API 字段真相。

## 3.2 本地开发入口与根目录约束

- 本地开发入口统一从仓库根目录触发。
- 前端本地开发入口是根目录执行的 `vp run website#dev`。
- 后端本地开发入口是根目录执行的 `air`。
- `air` 的根级配置文件固定为仓库根目录 `.air.toml`，其 build/run target 指向 `./apps/backend`；不允许在 `apps/backend` 下再维护第二份热重载入口或平行配置。
- 本地开发环境变量统一位于仓库根目录，不允许把必需 env 分散到 `apps/website`、`apps/backend` 或根级 shell 包装脚本。
- 本地开发 env 文件命名也统一收口在仓库根目录，例如 `.env.example`、`.env.local`。
- 仓库根目录 `.env.local` 是源码本地开发的必需前置条件；`.env.local.example` 只是模板，不是可直接视为“已配置完成”的运行时输入。
- 后端源码启动默认必须通过 env 显式拿到真实 datasource 配置；缺少 datasource env 时必须立即启动失败，不允许回填可工作的默认数据库地址。
- 后端连接类与监听类 env 使用标准命名：`PORT`、`DATABASE_URL`、`REDIS_URL`。不允许为默认开发/运行时再发明平行命名如 `*_DATABASE_DSN`、`*_REDIS_ADDRESS`、`*_LISTEN_ADDRESS`。
- PostgreSQL schema 管理固定使用 `pgschema`。这套工作流允许使用标准 PostgreSQL CLI 环境变量 `PGHOST`、`PGPORT`、`PGDATABASE`、`PGUSER`、`PGPASSWORD`、`PGSSLMODE` 作为 `pgschema` 输入；它们只服务于 schema tooling，不替代应用运行时的 `DATABASE_URL`。
- `PORT` 只表达监听端口，不承载“绑定哪个 host”的语义；后端运行时监听地址由实现统一绑定到 `0.0.0.0:<PORT>`。
- 本地开发默认运行路径必须连接真实 PostgreSQL / Redis 等依赖；不允许以内存 store、placeholder runtime、fake 状态或“临时默认值”作为正常源码开发后端。
- 不允许新增根级 `scripts/*.sh` 作为本地开发启动、代理或组合入口。
- `scripts/` 目录不承载日常本地开发职责；如需新增源码开发入口，优先收口到根工具链或正式 CLI。
- `docker compose` 只描述 self-hosted 交付链路，不作为默认本地开发流程。
- self-hosted 交付链路应直接使用 `docker compose` 作为规范入口，不再额外包装为 `pnpm`、Node CLI 或其他二次入口。

## 3.3 结构优先级

- 结构收口、技术债治理、运行时入口简化的优先级高于继续扩展产品功能面。
- 如果目录结构、启动命令、self-hosted 交付形态或文档口径仍在漂移，不应继续在其上叠加更多正式功能。
- 当结构治理与功能开发发生冲突时，先完成结构治理，再继续后续波次功能实现。

## 3.4 命名必须表达长期职责，不得表达执行阶段

- 长期保留的代码命名只允许表达以下内容：职责、产品面、模块边界、实体/动作语义、运行时边界、合同边界。
- 代码标识符、文件名、目录名、生成产物名、脚本名、测试套件名和公开合同标签，默认都必须落在上述命名集合里。
- 计划阶段、执行顺序、交付批次、临时状态、过渡状态不属于允许进入长期实现命名的语义集合。
- 如果某段实现仍是过渡路径，也必须按职责命名；“它现在仍是过渡实现”只能记录在 plan、debt、历史归档或明确注释中，并附退出条件。
- 生成链路同样遵守该白名单：生成脚本、生成文件、handler interface、adapter、fixture 与测试命名都必须表达能力或合同边界。
- 只有计划文档、历史归档、迁移说明和显式 debt 记录可以保留阶段术语；这些术语不是正式实现命名的一部分。
- 反例速查：如果命名里出现 `wave`、`phase`、`milestone`、`slice`、`temporary`、`transition`、`current`、`tracer`、`spike`、`compat` 这类词汇，应默认先怀疑它表达的是执行阶段、模糊迁移边界或过渡状态，而不是长期职责，并要求给出保留理由或直接重命名。
- 评审时如果发现命名表达的是执行阶段而不是长期职责，应直接视为结构漂移。

## 3.5 OpenAPI 来源分层

当前已存在的外部公开 API OpenAPI 来源：

- `toggl-track-api-v9.swagger.json`
- `toggl-reports-v3.swagger.json`
- `toggl-webhooks-v1.swagger.json`

后续应新增的 OpenToggl 自定义来源：

- `opentoggl-web.openapi.json`
- `opentoggl-import.openapi.json`
- `opentoggl-admin.openapi.json`

规则：

- `toggl-*` 只承载外部公开 API 定义
- `opentoggl-web` 承载 Web 前端自有后台接口
- `opentoggl-import` 承载导入产品面
- `opentoggl-admin` 承载实例管理与治理能力
- 不允许把自定义接口混进 `toggl-*`

## 4. 顶层仓库结构

目标态仓库结构如下：

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
        schema/

packages/
  web-ui/
  shared-contracts/
  utils/
```

说明：

- `apps/website` 是当前 Web 产品应用。
- `apps/backend` 是 Go 后端应用，`main.go` 是唯一进程入口，`internal/*` 同时承载 bootstrap、组合层与业务模块。
- `apps/backend` 只维护 Go 运行时代码、嵌入式静态占位资源与 Go 测试；不要在该目录再维护 `package.json`、`tsconfig`、`vite/vitest` 或前端测试 harness。
- `apps/backend/internal/platform/schema/` 是 PostgreSQL desired-state schema 的唯一归属目录，由 `pgschema` 负责 plan/apply，不允许在别处再维护并行 schema 真相源。
- `packages/` 只放跨应用共享、但不拥有业务流程的代码。
- 后端业务模块主体位于 `apps/backend/internal/*`，不再额外拆出顶层 `backend/` 目录。

前端的 `packages/web-ui` 不是可选项，而是应用级 UI 基线包：

- `apps/website/src` 负责产品页面、feature、entity 组件
- `packages/web-ui` 负责基于 `baseui` 的 theme、token、overrides 和薄包装
- 不允许把 `packages/web-ui` 退化成新的业务组件目录

当前仓库仍处于 starter 阶段，现有 `apps/website` 只是脚手架入口。
在前端正式重构前，先以 `apps/website` 为当前事实来源；目标结构只用于指导后续演进。

## 5. 顶层业务上下文

后端业务上下文固定按以下模块切分：

- `identity`：账户、登录态、API token、当前用户
- `tenant`：organization、workspace、本体设置与归属
- `membership`：成员关系、角色、组、项目成员可见性
- `catalog`：client、project、task、tag 等目录对象
- `tracking`：time entry、running timer、expense
- `governance`：approval、timesheet、audit、实例治理、API quota
- `reports`：报表读模型、导出、saved/shared reports
- `webhooks`：订阅、投递、重试、运行时健康
- `billing`：plan、subscription、invoice、customer、商业配额
- `importing`：导入、ID 保留、冲突、审计、重试
- `platform`：数据库、鉴权、filestore、jobs、可观测性等技术底座
- `platform/schema`：PostgreSQL schema desired state、blob/job/bootstrap 共享基础表定义，以及与 `pgschema` 对接的 schema 管理边界

模块职责的细化与模板以 [backend-architecture](./backend-architecture.md) 为准。

## 6. 单向依赖

唯一允许的主方向：

```text
web page -> feature -> entity/shared
transport -> application -> domain
infra ----> application / domain
all modules -> platform
```

明确禁止：

- `platform -> business module`
- `domain -> transport`
- `domain -> SQL / Redis / HTTP client`
- `page -> raw backend DTO`
- `feature A -> feature B` 的任意横向耦合
- `module A/infra -> module B/infra`

允许：

- 前端 `page` 装配多个 `feature` 与 `entity`
- 前端 `feature` 依赖 `entity` 与 `shared/*`
- 后端一个模块的 `application` 通过显式接口依赖另一个模块的 `application`
- `reports` 通过读模型与 query port 读取其他上下文的投影结果

## 7. 单一真相源

必须明确区分三类真相源：

- 产品真相源：`product/` 文档定义用户可见行为
- API/UI 强约束源：`openapi/*.json` 与 Figma
- 数据真相源：事务写模型以 PostgreSQL 为准，报表读模型以 `reports` projection 为准
- PostgreSQL 结构真相源：以仓库内 `pgschema` desired-state SQL 为准；live database 只是该真相源在某一时刻的落地结果

前端状态也必须有真相源分工：

- server state 以后端响应和 query cache 为准
- URL state 以路由参数和 search params 为准
- form draft 以表单状态为准
- 临时 UI state 只在本地组件树中存在

详细规则见 [frontend-architecture](./frontend-architecture.md)。

## 8. 同步与异步边界

必须同事务完成：

- 主业务写入
- 权限判断所需的最小状态变更
- audit record
- 后续异步处理所需的 `job record`

必须异步处理：

- reports projection
- webhook dispatch
- export generation
- import continuation
- notification / cleanup / maintenance

详细规则见 [backend-architecture](./backend-architecture.md)。

## 9. 新代码放哪

判断规则：

- 如果是一个新的用户操作流，优先落到前端 `features/`
- 如果是一个新的页面装配或路由族，落到前端 `pages/` 与 `routes/`
- 如果是一个新的领域对象展示与映射，落到前端 `entities/`
- 如果是一个新的事务型业务能力，落到对应后端模块的 `application/`
- 如果是一个新的实体、不变量、值对象，落到对应后端模块的 `domain/`
- 如果是一个新的数据库/缓存/第三方实现，落到对应后端模块的 `infra/` 或 `platform/`
- 如果是一个新的 PostgreSQL 表、索引、约束、trigger、RLS policy 或平台共享表定义，先判断 ownership，再通过 `platform/schema/` 汇总进 `pgschema` desired-state SQL，而不是直接改 live database
- 如果是一个新的 HTTP 入口，只能落到 `transport/http/*` 或 `apps/backend/internal/http` / `apps/backend/internal/web`
- 如果是一个新的跨产品测试要求，落到 [testing-strategy](./testing-strategy.md) 规定的位置

## 10. Code Review 检查项

做结构相关 review 时，至少检查：

- 是否把用户可见规则写进了 `product/`，而不是只藏在代码里
- 外部公开 API 是否明确以 `openapi/*.json` 为输入来源
- 是否遵守单向依赖，没有偷穿 `platform` 或跨模块 `infra`
- 是否把 server state、URL state、local UI state 混在一起
- 是否让页面直接吞 raw DTO，而没有经过 entity/view model 映射
- 是否让 `reports` 直接长期依赖 OLTP 在线扫表
- 是否在主请求里做本该异步的副作用
- 是否为新增能力补齐了对应层级的测试

## 11. 与其他文档的关系

- `docs/core/architecture-overview.md`：定义系统级运行时蓝图
- [frontend-architecture](./frontend-architecture.md)：定义前端状态、页面、组件与共享包规则
- [backend-architecture](./backend-architecture.md)：定义后端模块内部结构、协作与组合规则
- [testing-strategy](./testing-strategy.md)：定义测试矩阵、目录与验收边界
- `docs/core/domain-model.md`：定义 OpenToggl 已确定的领域模型与实现边界约束

本文档是入口，不是细节黑洞。
