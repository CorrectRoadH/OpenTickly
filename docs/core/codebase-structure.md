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
禁止在 `openapi/` 之外重复手写 compat API 字段真相。

## 3.5 OpenAPI 来源分层

当前已存在的兼容 OpenAPI 来源：

- `toggl-track-api-v9.swagger.json`
- `toggl-reports-v3.swagger.json`
- `toggl-webhooks-v1.swagger.json`

后续应新增的 OpenToggl 自定义来源：

- `opentoggl-web.openapi.json`
- `opentoggl-import.openapi.json`
- `opentoggl-admin.openapi.json`

规则：

- `toggl-*` 只承载外部兼容承诺
- `opentoggl-web` 承载 Web 前端自有后台接口
- `opentoggl-import` 承载导入产品面
- `opentoggl-admin` 承载实例管理与治理能力
- 不允许把自定义接口混进 `toggl-*`

## 4. 顶层仓库结构

目标态仓库结构如下：

```text
apps/
  website/
  api/

packages/
  web-ui/
  shared-contracts/
  utils/

backend/
  internal/
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
```

说明：

- `apps/website` 是当前 Web 产品应用。
- `apps/api` 是 Go API 进程入口与组合层。
- `packages/` 只放跨应用共享、但不拥有业务流程的代码。
- `backend/internal/*` 是后端业务模块主体。

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
- 如果是一个新的 HTTP 入口，只能落到 `transport/http/*` 或 `apps/api` 组合层
- 如果是一个新的跨产品测试要求，落到 [testing-strategy](./testing-strategy.md) 规定的位置

## 10. Code Review 检查项

做结构相关 review 时，至少检查：

- 是否把用户可见规则写进了 `product/`，而不是只藏在代码里
- compat API 是否明确以 `openapi/*.json` 为输入来源
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
