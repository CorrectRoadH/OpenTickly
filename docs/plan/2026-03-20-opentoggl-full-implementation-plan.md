# OpenToggl 完整实现计划

> **硬约束**
>
> 1. 本计划的开发执行必须由 subagent 完成，主 agent 只负责编排、依赖管理、review gate、汇总验收与合并决策。
> 2. 所有实现任务必须按 TDD 执行：先写失败测试，再写最小实现，再补重构与回归保护。
> 3. 任何正式产品能力都不能以 “先 API-only” 或 “先 Web-only” 方式落地；该能力所属波次必须同时完成对应 API、Web、测试链路。
> 4. self-hosted 不是发布后的附加脚本；从 Wave 0 起就必须作为正式交付目标推进，最终必须具备可构建、可启动、可验证的容器化交付物。

**Goal:** 在当前 starter 仓库上，按文档定义实现一个与 Toggl 当前公开产品面兼容的 OpenToggl v1，覆盖 Track API v9、Reports API v3、Webhooks API v1、对应 Web 界面，以及 OpenToggl 自有的 `import` 与 `instance-admin` 产品面。

**Architecture:** 采用单体优先架构，一个 Go `apps/api` 进程加一个 React `apps/website` 应用；后端按 `transport -> application -> domain` 和固定限界上下文拆分，前端按 `app/routes/pages/features/entities/shared` 拆分。事务写模型以 PostgreSQL 为真相源，报表与异步投递通过 in-process job runner 与投影读模型完成。

**Tech Stack:** Go + Echo + oapi-codegen + pgx + PostgreSQL + Redis；React + Vite+ + Tailwind CSS 4 + TanStack Router + TanStack Query + react-hook-form + zod + baseui + styletron。

---

## 0. 执行 Todo

> 说明：
>
> - `- [x]` 表示已通过当前波次 gate，可视为本计划当前已完成部分。
> - `- [ ]` 表示未完成，其中包含“未开始”和“进行中”两类；进行中的细项会在条目文字里标明。
> - 这里的勾选状态用于执行追踪，不替代下面各波次的正式 `退出标准` 与 `强制测试链路`。

- [x] Wave 0：工程地基与生成链路
  - [x] `apps/api`、`apps/website`、`packages/web-ui`、`packages/shared-contracts` 基线落地
  - [x] `opentoggl-web` / `opentoggl-import` / `opentoggl-admin` 初始合同骨架落地
  - [x] `vp test`、`vp check`、`go test ./apps/api/... ./internal/... ./backend/internal/...` 当前可通过
- [ ] Wave 1：Identity、Session、Tenant、Billing Foundation 与应用壳
  - [x] Wave 1 Web 合同扩展：`openapi/opentoggl-web.openapi.json`
  - [x] `billing-foundation` 后端基础切片第一版
  - [x] `tenant-backend` 后端基础切片第一版
  - [x] `identity-backend` 切片完全过 gate
  - [x] `identity-tenant-web` 切片完全过 gate
  - [ ] Wave 1 整体退出标准全部满足
- [ ] Wave 2：Membership、Access、Catalog 完整产品面（进行中：已完成首个 contracts + members/projects slice）
- [ ] Wave 3：Tracking 核心事务面
- [ ] Wave 4：Tracking 扩展面与 Governance
- [ ] Wave 5：Reports 读模型与共享
- [ ] Wave 6：Webhooks Runtime
- [ ] Wave 7：Billing 商业视图、发票与收口
- [ ] Wave 8：Importing 迁移闭环
- [ ] Wave 9：Instance Admin / Platform Operations
- [ ] Wave 10：兼容性收口与发布准备
- [ ] 测试计划与故事清单持续维护
  - [ ] 建立 BDD 故事入口：`docs/testing/bdd-user-stories.md`
  - [ ] 每个 Wave 开始前，把对应产品面的故事映射到 `Domain / Integration / Contract / Feature / Page Flow / E2E / Golden`
  - [ ] 每个 Wave 结束时，更新“已覆盖故事 / 未覆盖故事 / 延后原因”清单
  - [ ] Wave 10 前补齐 `testing-strategy` 明确要求但尚未实现的 page flow 与 e2e
  - [ ] 为每个正式页面族建立 `PRD -> Figma 节点 -> 页面实现 -> page flow/e2e` 对照清单
- [ ] 自部署与发布交付链路
  - [ ] 明确 self-hosted 交付形态：前后端双镜像 + 反向代理
  - [ ] 前后端生产构建可生成稳定镜像，而不是依赖开发态启动
  - [ ] `docker compose` 本地/自托管启动链路可用，并覆盖 `website + api + postgres + redis`
  - [ ] 数据库迁移、首次管理员初始化、默认配置注入有正式流程
  - [ ] 健康检查、readiness、基础日志与最小 smoke test 固定
  - [ ] 升级/回滚步骤、持久化卷和必要环境变量文档化
  - [ ] Wave 10 产出正式 release artifact：镜像、compose 文件、样例 env、发布说明

## 1. 计划依据

本计划以以下文档为权威输入，发生冲突时按该顺序解释：

1. `docs/core/product-definition.md`
2. `docs/product/*.md`
3. `openapi/toggl-track-api-v9.swagger.json`
4. `openapi/toggl-reports-v3.swagger.json`
5. `openapi/toggl-webhooks-v1.swagger.json`
6. Figma 原型
7. `docs/core/domain-model.md`
8. `docs/core/architecture-overview.md`
9. `docs/core/codebase-structure.md`
10. `docs/core/backend-architecture.md`
11. `docs/core/frontend-architecture.md`
12. `docs/core/testing-strategy.md`
13. `docs/testing/bdd-user-stories.md`
14. `docs/self-hosting/docker-compose.md`

本计划不重写产品语义，只把这些定义收束为可执行的实施蓝图。

## 2. 当前状态判断

当前仓库仍处于 starter 阶段：

- `apps/website` 仍是 Vite 默认模板，不是正式 Web 应用。
- `apps/api`、`backend/internal/*`、`packages/web-ui`、`packages/shared-contracts` 仍不存在。
- `openapi/` 已有 Toggl compat 定义，但尚未落成 transport、contract test、golden test 与运行时。
- 现有测试无法支撑任何产品面验收。

因此这不是增量改造计划，而是受强文档约束的 greenfield 实现计划。

## 3. 不可违反的实现约束

### 3.1 产品约束

- OpenToggl 首版直接以 Toggl 公开产品面为自己的产品定义，不允许做“像 Toggl”的本地重解释。
- 低频能力也属于正式产品面，不能因为使用频率低就延期为未实现占位。
- Cloud 与 self-hosted 必须共享同一公开契约与功能面。
- `import` 与 `instance-admin` 是 OpenToggl 首版正式产品面，不是脚本或运维手册。

### 3.2 架构约束

- 后端限界上下文固定为：`identity`、`tenant`、`membership`、`catalog`、`tracking`、`governance`、`reports`、`webhooks`、`billing`、`importing`、`platform`。
- 依赖方向固定为：
  - `web page -> feature -> entity/shared`
  - `transport -> application -> domain`
  - `infra -> application / domain`
  - `all modules -> platform`
- 明确禁止：
  - `platform -> business module`
  - `domain -> transport`
  - `domain -> SQL / Redis / HTTP client`
  - `page -> raw backend DTO`
  - `feature -> feature`
  - `module A/infra -> module B/infra`
- 主写路径必须在单个 PostgreSQL 事务内完成主业务写入、audit record 与 job record。
- reports projection、webhook delivery、export generation、import continuation 等必须异步运行，且通过同事务写入的 job record 驱动。

### 3.2.1 前端与 Figma 对齐约束

- 任何在 `docs/product/*.md` 中已绑定 Figma 原型或节点 ID 的正式页面，都必须把 Figma 作为实现输入，而不是只按接口和字段把页面“搭出来”。
- 前端实现必须优先对齐：
  - 页面信息架构
  - 主次区域布局
  - 正式入口与导航关系
  - 关键交互状态
  - 空态、加载态、错误态
  - 与同一路由族共享的筛选、header 和工作区上下文
- 不允许用“先做一个通用表单/列表占位页，后面再慢慢贴 Figma”的方式宣称页面已完成。
- 如果某个正式页面在 PRD 中没有对应 Figma 节点：
  - 必须在任务单中明确写明“当前无独立 Figma 节点”
  - 必须引用可复用的相邻页面原型或文档指定骨架来源
  - 不得自行发明另一套与现有产品语言冲突的信息架构
- 页面完成的验收不只看是否能提交数据，还必须看它是否与 PRD 中声明的 Figma 原型保持同一页面语义。

### 3.3 测试约束

- 测试是主要验收机制，不依赖人工 QA 兜底。
- 测试设计起点必须是 `docs/product/*.md` 用户故事，不是 endpoint 清单。
- `docs/testing/bdd-user-stories.md` 是当前已沉淀的验收故事入口；后续波次必须持续补充，而不是另起一套测试语义。
- 全量测试必须保持本地快速门禁，总预算 `<= 30s`。
- 测试必须尽量使用真实依赖与真实边界，只对真正外部系统做 fake/stub。
- 新增功能、缺陷修复、并发/幂等/权限/边界规则都必须先有失败测试。

### 3.4 自部署与发布约束

- Cloud 与 self-hosted 共享同一公开契约与正式功能面，不能通过“自托管版先少一半功能”缩 scope。
- 前端和后端必须能产出正式生产构建，并以容器化交付物运行；不允许把开发服务器拼装成伪生产方案。
- self-hosted 至少要提供：
  - 可构建镜像
  - 可启动的 `docker compose` 栈
  - 数据库迁移与首次管理员初始化流程
  - 持久化卷策略
  - 健康检查与基础 smoke test
  - 升级与回滚说明
- Wave 10 的完成标准必须包含“新环境按文档启动后可登录、可进入 workspace、可通过基础 health 与 smoke test”，否则不算可发布。

## 4. 强制执行模型：Subagent-Driven Delivery

本计划的默认执行模式不是“主 agent 自己逐个实现”，而是“主 agent 编排，subagent 生产”。

### 4.1 角色划分

- `Orchestrator`
  - 读取计划，维护依赖图、任务队列、完成状态与风险。
  - 为每个任务准备最小充分上下文，不把整段会话历史直接扔给 worker。
  - 控制并行度，避免重叠写集。
  - 负责最终验收、整体验证和阶段合并。
  - 必须基于完整上下文做集成 review，而不是只相信 subagent 自报“完成”。
  - 对所有 subagent 交付执行 repo hygiene、依赖方向、架构边界、坏味道与 task packet 偏移检查。
- `Story/Test Design Subagent`
  - 在每个波次开始前，先读取对应 PRD、core docs、OpenAPI 与必要 Figma 引用。
  - 把 PRD 中的用户故事、目标、失败分支、关键约束抽成该波次的验收故事清单。
  - 为每条故事生成测试映射：`Domain Unit -> Application Integration -> Transport Contract -> Frontend Feature/Page Flow -> E2E -> Golden`。
  - 产出后续 implementer 要消费的 task packet，而不是直接写业务实现。
- `Contract Generation Subagent`
  - 对 compat 能力，基于现有 `toggl-*.swagger.json` 生成 transport、DTO、validator、contract skeleton 与 golden skeleton。
  - 对 OpenToggl 自定义能力，先维护 `opentoggl-web.openapi.json`、`opentoggl-import.openapi.json`、`opentoggl-admin.openapi.json`，再从这些 OpenAPI 生成 transport 与 contract skeleton。
  - 不手写公开合同 shape；公开合同以 OpenAPI JSON 文件为源，再生成运行时边界。
- `Implementer Subagent`
  - 只拥有被分配任务的文件边界和职责边界。
  - 必须按 TDD 工作，并在交付时附上测试证据与自检结果。
- `Spec Reviewer Subagent`
  - 只检查是否偏离产品文档、OpenAPI、Figma、架构与测试策略。
- `Quality Reviewer Subagent`
  - 只检查实现质量、边界、可维护性、测试设计和回归风险。

### 4.2 并行原则

- 同一波次内，只允许并行执行没有重叠写集的任务。
- 如果两个任务会同时改同一模块、同一路由树、同一 OpenAPI 文件或同一共享包，则不能并行。
- 并行优先级顺序：
  1. 基础设施骨架与测试骨架
  2. 独立上下文的 vertical slice
  3. 共享层收口
  4. 跨上下文联调
- 若 harness 支持，为每个并行 stream 使用独立 worktree；否则保持严格文件 ownership，禁止交叉修改。

### 4.3 每个任务的交付协议

每个开发任务开始前，`Orchestrator` 必须先准备一个明确的 task packet，subagent 不应该拿到一句含糊的“去做 tracking”。

每个 task packet 至少包含：

1. 任务名称与目标
2. 该任务服务的产品面
3. 对应 PRD 路径
4. 对应 core docs 路径
5. 对应 OpenAPI JSON 路径
6. 对应 Figma 文件、节点 ID 与 screenshot 引用；如果当前页面无独立 Figma 节点，必须明确说明回退参考来源
7. 要提炼的用户故事清单
8. 每条用户故事对应的测试链路
9. subagent 的文件 ownership
10. 明确不允许碰的文件或模块
11. 若涉及测试，引用的 BDD 故事路径与场景
12. 若涉及 self-hosted / release，引用容器、迁移、env 与 smoke test 要求
13. 交付所需命令与验收门槛

task packet 模板：

```text
Task: [clear slice name]
Product Area: [identity | tracking | reports | ...]
PRD:
- docs/product/...
Core Docs:
- docs/core/...
OpenAPI Source:
- openapi/...
Figma Reference:
- file: ...
- node: ...
- fallback reference when no dedicated node: ...
Generated Boundary:
- generated transport / DTO / validator / contract skeleton
User Stories:
- story 1
- story 2
BDD Source:
- docs/testing/bdd-user-stories.md
Required Tests:
- Domain Unit: ...
- Application Integration: ...
- Transport Contract: ...
- Frontend Feature/Page Flow: ...
- E2E: ...
- Golden: ...
Ownership:
- Modify: ...
- Do Not Touch: ...
Definition of Done:
- ...
```

每个 implementer subagent 的交付必须包含：

1. 任务目标与负责文件清单
2. 先写的失败测试与失败原因
3. 最小实现与为何足以通过当前测试
4. 新增或更新的回归测试
5. 本地验证命令与结果摘要
6. 未解决风险、已知限制、是否需要更高层收口

如果 subagent 不能给出第 2 项和第 5 项，该任务视为未完成。

### 4.4 每个任务的 gate

每个任务完成顺序固定为：

1. implementer 写失败测试并确认失败
2. implementer 写最小实现并跑通过
3. implementer 自检并提交结果
4. orchestrator 做上下文集成 review
5. spec reviewer 检查是否符合文档与合同
6. quality reviewer 检查边界、代码与测试质量
7. orchestrator 决定是否合并、返工或拆分

任何 reviewer 提出阻断问题，该任务必须回到 implementer 修复后再审。

`orchestrator` 的上下文集成 review 是硬 gate，不是走流程。检查项至少包括：

- 任务是否只修改了 task packet 允许的文件与模块
- 是否引入了无关改动、顺手重构、临时脚手架、一次性辅助代码或泄漏的调试产物
- 当前 diff 是否仍符合单向依赖规则
- 是否出现架构偏移，例如：
  - `platform -> business module`
  - `domain -> transport`
  - `domain -> SQL / Redis / HTTP client`
  - `page -> raw backend DTO`
  - `feature -> feature`
  - `module A/infra -> module B/infra`
- 是否把业务语义错误地下沉到 `packages/web-ui`、`shared-contracts` 或 transport generated artifacts
- 是否出现明显坏味道：重复逻辑、过宽接口、模糊命名、职责漂移、硬编码 feature gate、mock 内部行为、测试只测实现细节
- 是否遵守仓库代码要求：尽量小而直接、无多余 env、无多余扩展点、必要处有解释“为什么”的注释
- git 工作区是否只包含当前任务预期变更；若出现意外脏文件，必须先识别来源再决定是否打回
- 本任务完成后，代码库是否仍保持可继续集成的健康状态

任一项不满足，`orchestrator` 必须直接打回 implementer，而不是带着问题进入 spec / quality review。

### 4.4.1 打回规则

以下情况一律打回，不允许“先合进去后面再收拾”：

- 不符合 task packet 范围
- 破坏单向依赖或模块边界
- 引入架构偏移
- 仓库出现不明来源脏改动
- 测试链路缺层，或没有先失败后通过的证据
- 代码有明显坏味道，且会污染后续波次
- 为了通过当前任务，偷偷引入未来很难收口的临时实现

被打回的任务必须：

1. 由同一个 implementer subagent 根据 review finding 修复
2. 重新提交验证结果
3. 重新经过 `orchestrator -> spec reviewer -> quality reviewer` 全链路

### 4.5 每个波次的启动顺序

每个波次都必须按以下顺序启动：

1. `Story/Test Design Subagent`
   - 读取该波次 PRD 与 core docs
   - 提炼用户故事与失败分支
   - 生成故事到测试矩阵
2. `Contract Generation Subagent`
   - 对 compat 面，从既有 `openapi/*.json` 生成 transport / contract skeleton
   - 对自定义能力，先更新 `opentoggl-*.openapi.json`，再生成 skeleton
3. `Backend Implementer Subagent`
   - 领取明确 task packet，先写失败测试，再写最小实现
4. `Frontend Implementer Subagent`
   - 领取明确 task packet，基于已存在合同和 story-to-test map 实现页面、feature、page flow
5. `Spec Reviewer Subagent`
6. `Quality Reviewer Subagent`

如果第 1 步和第 2 步未完成，后续 implementer 不得开始写功能代码。

## 5. 目标仓库结构

首轮结构调整完成后，仓库应进入如下目标态：

```text
apps/
  website/
  api/
    internal/
      bootstrap/
      http/
      web/

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

openapi/
  toggl-track-api-v9.swagger.json
  toggl-reports-v3.swagger.json
  toggl-webhooks-v1.swagger.json
  opentoggl-web.openapi.json
  opentoggl-import.openapi.json
  opentoggl-admin.openapi.json
```

前端必须落成：

```text
apps/website/src/
  app/
  routes/
  pages/
  features/
  entities/
  shared/
```

## 6. 总体实施策略

整体上不按“先把所有后端写完，再补前端”推进，而按 vertical slice 波次推进。每个波次都需要同时完成：

- 后端 domain / application / infra / transport
- 对应 OpenAPI 边界或自定义 OpenAPI
- Web 页面、feature、page flow
- 对应测试链路

前端对齐规则：

- 如果 PRD 中该页面已有 Figma 原型，前端任务必须先读取对应节点，再进入实现。
- Page flow 和 e2e 只验证行为走通；它们不替代 Figma 对齐检查。
- 每个正式页面族在波次收口时都必须提供一份 `PRD -> Figma 节点 -> 实现页面 -> page flow/e2e` 对照结果。
- Figma 对齐至少要回答：
  - 当前实现对应哪个 Figma 节点
  - 哪些布局/入口/状态已对齐
  - 哪些差异是有意延后
  - 没有独立节点的页面借用了哪一个现有页面骨架

前端 implementer 的固定步骤：

1. 先读对应 `docs/product/*.md` 的页面映射段，确认该页面是否已有 Figma 节点、截图或明确骨架来源。
2. 把 task packet 中的 Figma 文件、节点 ID、fallback 页面写清楚，再开始拆 `page / feature / entity / shared`。
3. 先实现页面信息架构和壳层关系，再实现表单、列表、筛选和 mutation，不允许先做一个与目标页面结构无关的通用占位页。
4. 页面完成时必须补：
   - 真实页面 route
   - 对应 feature test
   - 对应 page flow test
   - 该页面关联的 BDD 故事映射
5. 波次收口时必须提交 Figma 对齐结果：
   - Figma 节点引用
   - 当前页面截图或等价证据
   - 已对齐项
   - 已知差异和延后原因

只有异步读模型、共享 UI、shared contracts 这类明显横切能力，才允许单独作为基础波次先行。

合同优先规则：

- 任何 compat API 变更或实现，都必须以现有 `toggl-*` OpenAPI JSON 为源，先生成 transport、DTO、validator、contract skeleton 与 golden skeleton，再落 handler 和实现。
- 任何 OpenToggl 自定义 Web / import / admin 接口，都必须先更新对应 `opentoggl-*.openapi.json`，再从该 OpenAPI 生成 transport 和 contract skeleton，然后进入实现。
- 不允许 subagent 先手写 handler、前端请求层或公开 DTO shape，再事后补 OpenAPI。
- 不允许业务模块各自发明 feature gate、quota header、error body 或 admin/import Web 接口 shape；这些都必须回到对应合同来源统一定义。

## 7. 波次规划

### Wave 0: 工程地基与生成链路

**目标**

把仓库从 Vite starter 演进到可承载正式产品开发的 monorepo 基线。

**范围**

- 建立 `apps/api`
- 建立 `apps/api/internal/bootstrap`、`apps/api/internal/http`、`apps/api/internal/web`
- 建立 `backend/internal/*` 模块骨架与 `platform` 基础设施骨架
- 建立 PostgreSQL Blob `filestore` 抽象、blob 表与平台 wiring，作为 logo/avatar、expense attachment、report export、invoice artifact、import archive 的统一基础
- 把 `apps/website` 重构成 React + Router + Query 正式入口
- 把 `tailwindcss@4` 接入正式前端 runtime，并明确它与 `baseui/styletron` 的分工
- 建立 `packages/web-ui`、`packages/shared-contracts`
- 建立 compat OpenAPI 生成、contract test、golden test 骨架
- 建立 Web 自定义 OpenAPI：`opentoggl-web`、`opentoggl-import`、`opentoggl-admin`
- 建立 feature gate / quota / capability check 的统一接口边界，但在 Wave 7 之前只允许提供最小占位实现，不允许把 gate 规则散落到业务模块
- 建立最小测试脚手架与统一门禁
- 建立 self-hosted 容器化交付骨架：生产构建、Dockerfile、compose、health/readiness、基础 smoke 脚本

**推荐并行 streams**

- `api-foundation` subagent
  - `apps/api`
  - `backend/internal/platform`
  - `apps/api/internal/bootstrap` / `http` / `web`
  - bootstrap / config / db / redis / filestore / job runner 骨架
- `web-foundation` subagent
  - `apps/website/src/app`
  - `apps/website/src/routes`
  - Tailwind CSS 4 runtime、全局样式入口与 layout primitives
  - `packages/web-ui`
- `contracts-testing-foundation` subagent
  - `packages/shared-contracts`
  - compat transport generation pipeline
  - `opentoggl-web` / `opentoggl-import` / `opentoggl-admin` 初始合同骨架
  - feature gate / quota header 合同与测试骨架
  - contract/golden/e2e 目录与 fixture 规范
- `self-hosting-foundation` subagent
  - 生产镜像构建骨架
  - `docker compose` 基线
  - health/readiness 与最小 smoke 命令
  - env/volume/migration/init 约定

**依赖**

- 无上游实现依赖，是全计划的起点。

**退出标准**

- 根目录、API、Web 都能启动最小正式 runtime
- Web 端已完成 `tailwindcss@4 + baseui + styletron` 的共存基线，而不是后续再补
- OpenAPI 生成链路可用
- compat 与 `opentoggl-*` 自定义合同都已有最小可生成骨架
- capability check / feature gate 只有统一入口，没有散落在各模块里的硬编码分支
- PostgreSQL Blob `filestore` 已可被应用层通过统一接口消费，而不是等附件类功能出现时再补
- 测试目录、命名、最小 fixture 和并发策略固定
- `docs/testing/bdd-user-stories.md` 已成为测试设计输入，而不是只留在会话中
- 至少有一套可构建的 API/Website 生产镜像骨架与 `docker compose` 启动基线
- health/readiness、迁移入口、最小 smoke test 命令已固定
- `vp check`、`vp run test -r`、`vp run build -r` 与 Go 测试入口可工作

### Wave 1: Identity、Session、Tenant、Billing Foundation 与应用壳

**目标**

打通用户登录态、当前用户、账户资料、workspace/organization 基础对象、billing 事实来源，以及全站共享 app shell。

**范围**

- `identity`
  - register / login / logout
  - basic auth 兼容
  - api token
  - current user / profile / preferences
  - deactivated / deleted 语义
- `tenant`
  - organization / workspace CRUD
  - workspace settings
  - branding assets
  - 默认币种、默认费率、rounding、display policy
- `billing`
  - plan / subscription / customer / quota / feature gate 的核心事实模型
  - organization/workspace subscription 视角的统一真相
  - quota header 与 capability check 基础实现
- Web
  - 登录/注册页
  - profile
  - settings
  - organization / workspace 管理页
  - workspace logo / avatar 管理入口
  - left nav / workspace switcher / session bootstrap

**推荐并行 streams**

- `identity-backend` subagent
- `tenant-backend` subagent
- `billing-foundation` subagent
- `identity-tenant-web` subagent

**依赖**

- 依赖 Wave 0 runtime、路由、contract 与测试骨架。
- Wave 1 涉及的自定义 Web 接口必须先落到 `opentoggl-web.openapi.json`，再进入 transport 与页面实现。

**退出标准**

- 用户可以进入 workspace
- 当前用户与 workspace 设置能通过 API 与 Web 读取、更新
- organization / workspace 管理、logo / avatar 入口已具备正式页面与合同支撑
- 停用用户会被阻止继续登录和继续写业务数据
- 停用中的 running timer 自动停止语义有测试覆盖
- feature gate、quota header 与 capability check 已由 billing 提供正式事实来源，不再允许“默认全开占位实现”
- Wave 1 范围内的 BDD 故事已映射到 page flow / e2e / contract / integration
- `profile`、`settings`、共享 app shell 已明确引用各自 PRD 中的 Figma 节点，并提交对齐结果
- `docker compose` 基线可启动 Wave 1 所需服务，并完成 login + shell + health smoke test

**强制测试链路**

- Domain Unit: user/account/security state/value objects
- Frontend Unit: session mapper、profile/settings form adapter、workspace settings/url adapter
- Application Integration: login/session/token/tenant settings、billing quota/capability check
- Transport Contract: compat auth / identity / tenant endpoints
- Frontend Feature: 登录、更新 profile、更新 settings
- Frontend Page Flow: profile / settings / shell / workspace switcher / organization-workspace management
- E2E: 登录后进入 workspace 成功

### Wave 2: Membership、Access、Catalog 完整产品面

**目标**

建立所有后续 tracking、reports、webhooks 都依赖的授权、成员生命周期和目录对象，并把 projects / clients / tasks / tags 做到正式产品面对齐，而不是只落骨架。

**范围**

- `membership`
  - owner / admin / member
  - invite / join / disable / restore / remove
  - organization/workspace/project/group 关系
  - member rate / cost
- `catalog`
  - client / project / task / tag
  - private / billable / archived / pinned / rate / currency / estimated_seconds / fixed_fee
  - project users / project groups
  - create / view / update / delete
  - archive / restore
  - pin / unpin
  - templates、stats、periods
- Web
  - 组织成员页、工作区成员页、组管理页、项目成员页
  - 费率 / 成本设置页
  - 权限配置页
  - 完整 project / client / task / tag 页面，而不是 skeleton

**推荐并行 streams**

- `membership-core` subagent
- `catalog-core` subagent
- `members-projects-web` subagent

**依赖**

- 依赖 Wave 1 的 identity、tenant、session 与 workspace settings。
- Wave 2 涉及的 Web 后台接口必须先扩充 `opentoggl-web.openapi.json`，不得绕过合同直接补 endpoint。

**退出标准**

- 权限模型以数据和合同生效，而不是只靠 UI 隐藏
- 私有项目的可见性和可写性在 API、Web、报表入口前置校验上保持一致
- 费率与成本字段已成为 tracking / reports 的可用输入
- project / client / task / tag 已完成正式产品面对齐，包括 CRUD、archive/restore、pin/unpin、模板和 stats/periods
- 费率 / 成本设置页与权限配置页已具备正式页面、合同与测试覆盖
- Wave 2 范围内的故事覆盖状态已更新到测试故事清单
- `project page`、`client page` 以及成员/权限相关正式页面已引用 PRD/Figma 或明确 fallback 骨架，并提交对齐结果

**强制测试链路**

- Domain Unit: 角色、授权、成员状态、项目私有性、费率优先级对象
- Frontend Unit: member list mapper、rate/cost form adapter、project/client/tag filter/url adapter
- Application Integration: invite/join/disable/restore/remove、项目成员授权、成员费率
- Transport Contract: members/groups/projects/clients/tags 端点
- Frontend Feature: 邀请成员、归档项目、私有项目授权
- Frontend Page Flow: project page / client page / tag page / 组织成员页 / 工作区成员页 / rate-cost-settings / permission-config
- E2E: 创建 project 后在成员和 timer 相关入口可见

### Wave 3: Tracking 核心事务面

**目标**

把 OpenToggl 的主业务事实源建立起来，让 time entry 和 running timer 成为所有下游产品面的统一基础。

**范围**

- `tracking`
  - time entry CRUD
  - running timer start / stop / conflict handling
  - bulk update
  - filter / since sync
  - timezone / RFC3339 / UTC semantics
  - billable / rate / client / project / task / tag 解释
- Web
  - timer list
  - timer calendar
  - timer timesheet
  - create/edit timer flows

**推荐并行 streams**

- `tracking-write-path` subagent
- `tracking-query-path` subagent
- `timer-page-family` subagent

**依赖**

- 依赖 Wave 2 的 membership、catalog、workspace settings、rate/cost 规则。
- Wave 3 中新增的 tracking Web 接口必须先落到 `opentoggl-web.openapi.json`；compat 部分仍严格以 `toggl-track-api-v9.swagger.json` 为边界来源。

**退出标准**

- 同一份 tracking 事实同时驱动 list、calendar、timesheet
- running timer 冲突规则固定且有回归保护
- `start/stop/duration` 非法组合返回固定错误
- since sync 与主要过滤在 compat API 与 Web 行为上对齐
- Wave 3 对应的 `timer` 页面族 page flow 与核心 e2e 已按 testing-strategy 落地
- `calendar`、`list`、`timesheet` 三个正式视图已引用对应 Figma 节点，并证明它们共享同一页面族语义

**强制测试链路**

- Domain Unit: duration、time range、timer state、rate resolution
- Frontend Unit: time entry mapper、duration/date formatter、timer filter/url adapter、time-entry form adapter
- Application Integration: create/update/stop/bulk update/filter/sync
- Transport Contract: time entries / running timer compat endpoints
- Frontend Feature: start/stop timer、create/edit entry、bulk update
- Frontend Page Flow: `calendar | list | timesheet` 同路由族一致性
- E2E:
  - 登录后启动并停止 timer
  - 在 `calendar/list/timesheet` 间切换状态不丢失
- Golden: compat time entry JSON shape

### Wave 4: Tracking 扩展面与 Governance

**目标**

补齐 approvals、expenses、favorites、goals、reminders、timeline，以及 tracking 与治理交叉规则。

**范围**

- `governance`
  - approvals 状态机
  - timesheet approval authority
  - audit linkage
- `tracking`
  - expenses 状态机、attachment、currency snapshot
  - favorites / goals / reminders / timeline
- Web
  - approvals 页面
  - expenses 页面
  - 相关 tracking 扩展入口

**推荐并行 streams**

- `approvals-governance` subagent
- `expenses-tracking` subagent
- `low-frequency-tracking-ui` subagent

**依赖**

- 强依赖 Wave 3 tracking 事实源。
- Wave 4 的 tracking / governance Web 接口继续先改 `opentoggl-web.openapi.json` 再改实现。

**退出标准**

- approval / expense 状态机固定
- 审批权限、编辑回退到 `reopened` 等规则在 API 与 Web 一致
- 附件、汇率快照、历史结果冻结语义完整
- Wave 4 覆盖状态已回填到测试故事清单，并标明剩余缺口

**强制测试链路**

- Domain Unit: approval / expense state machine
- Frontend Unit: approval status mapper、expense currency/attachment adapter、expense form adapter
- Application Integration: approve/reject/reopen、expense submit/approve/reimburse、attachment rule
- Transport Contract: approvals / expenses / favorites / reminders 等 compat 端点
- Frontend Feature: 提交审批、编辑 expense、附件上传
- Frontend Page Flow: approvals / expenses 页面
- Golden: expense / approval 输出 shape

### Wave 5: Reports 读模型与共享

**目标**

在不重新定义 tracking 语义的前提下，构建独立 reports 产品面。

**范围**

- `reports`
  - detailed / summary / weekly / trends / profitability / insights
  - saved reports
  - shared reports
  - filters、pagination、sorting、exports
  - 报表投影与导出
- Web
  - detailed / summary / weekly / trends / profitability / insights
  - save/share/export flows

**推荐并行 streams**

- `reports-read-model` subagent
- `reports-api-exports` subagent
- `reports-web` subagent

**依赖**

- 依赖 Wave 2 的 membership/catalog/rate
- 依赖 Wave 3-4 的 tracking / approvals / expenses
- Reports API v3 始终以 `toggl-reports-v3.swagger.json` 为 compat 合同来源；任何 saved/shared/export 的 Web 自定义编排接口必须落在 `opentoggl-web.openapi.json`。

**退出标准**

- 在线查询、导出、saved report、shared report 使用同一套权限与过滤语义
- 报表与 tracking 的历史事实解释一致
- 汇率、rounding、profitability 规则在 shared/export/online 三者一致
- 报表页面族 page flow、导出 golden 与至少一条高价值 e2e 已对齐 stories

**强制测试链路**

- Domain Unit: report filter、time slicing、aggregation helper
- Frontend Unit: report filter adapter、report table mapper、export option form adapter
- Application Integration: saved/shared report、permission-cut result、export job record
- Async Runtime: projector refresh、export generation、rebuild/retry
- Transport Contract: Reports API v3 全部公开端点
- Frontend Feature: 保存报表、共享、导出
- Frontend Page Flow: 报表页面族
- E2E: 创建 project 并在 report 中可见
- Golden:
  - report JSON shape
  - CSV/PDF/XLSX 列结构基线

### Wave 6: Webhooks Runtime

**目标**

实现完整 Webhooks 产品面，而不是只做 subscription CRUD。

**范围**

- `webhooks`
  - subscription CRUD
  - filters
  - validate / ping
  - signature
  - delivery records
  - retry / disable / limits / status
  - owner/workspace/visibility 变化后的事件暴露裁剪
- Web
  - integrations webhooks 页
  - subscriptions、filters、validate/ping、delivery history、failure attempts、limits、status

**推荐并行 streams**

- `webhooks-core-runtime` subagent
- `webhooks-delivery-status` subagent
- `webhooks-web` subagent

**依赖**

- 依赖 Wave 2 权限模型
- 依赖 Wave 3-4 tracking/governance 事件事实
- Webhooks API v1 始终以 `toggl-webhooks-v1.swagger.json` 为 compat 合同来源；Web 管理页的附加查询/诊断接口若不属于 compat 面，必须进入 `opentoggl-web.openapi.json`。

**退出标准**

- validate/ping 与真实 delivery 共享运行时，但状态可区分
- retry / disable / limits / status 是正式运行时行为，不是管理脚本
- 私有项目和权限变化会影响后续事件暴露
- Webhooks 页面族、runtime test 与基础验证 e2e 已按 stories 覆盖
- `integrations webhooks` 页面已引用 PRD 中的 Figma 节点并提交对齐结果

**强制测试链路**

- Domain Unit: filter、signature、subscription state
- Frontend Unit: webhook filter mapper、status badge mapper、validate form adapter
- Application Integration: create/validate/ping/disable
- Async Runtime: delivery retry、dead-letter/final failure、owner visibility change
- Transport Contract: Webhooks API v1 全部公开端点
- Frontend Feature: create subscription、validate endpoint、查看失败记录
- Frontend Page Flow: integrations webhooks 页面
- E2E: webhook subscription 创建并完成基础验证
- Golden: webhook payload / status output

### Wave 7: Billing 商业视图、发票与收口

**目标**

在 Wave 1 已建立 billing 核心事实来源的前提下，补齐商业视图、发票、customer 管理与最终产品收口。

**范围**

- `billing`
  - invoice / download
  - customer edit
  - plan/subscription/quota 的展示与管理细节
  - invoice list / download
- Web
  - billing / subscription / plans / limits / invoices / customer

**推荐并行 streams**

- `billing-core-gates` subagent
- `billing-commercial-views` subagent
- `billing-web` subagent

**依赖**

- 依赖 Wave 1 tenant 关系
- 依赖 Wave 2 membership seat 语义
- 依赖 Wave 5-6 中需要 quota/gate 的能力接入

**退出标准**

- feature gate 与 quota 事实来源继续保持由 billing 统一提供
- organization/workspace 的 subscription 视角不形成两套真相
- self-hosted 虽可使用不同底层计费实现，但对外状态表达与对象模型一致
- 计划降级、超限与历史对象保留的故事已有明确测试映射与覆盖状态

**强制测试链路**

- Domain Unit: subscription state / quota rule / feature gate rule
- Frontend Unit: billing plan mapper、invoice list formatter、customer form adapter
- Application Integration: quota headers、plan downgrade、invoice/customer query
- Transport Contract: billing/public commercial endpoints
- Frontend Feature: 查看 quota、查看 invoice、更新 customer
- Frontend Page Flow: billing/subscription 页面
- Golden: plan/quota/header shape

### Wave 8: Importing 迁移闭环

**目标**

把 `import` 实现成正式产品能力，而不是一次性脚本。

**范围**

- `importing`
  - import job
  - ID mapping
  - 两阶段实体导入与 time entry 导入
  - conflict / failure / retry / diagnostics
  - import result API
- OpenAPI
  - `opentoggl-import.openapi.json`
- Web
  - import 页面
  - 导入任务列表
  - 冲突/失败诊断页
  - retry 入口

**推荐并行 streams**

- `import-engine` subagent
- `import-runtime-diagnostics` subagent
- `import-web` subagent

**依赖**

- 依赖 Wave 1-4 的核心实体和 tracking 事实源
- 依赖 Wave 5 reports 可回读一致性
- `opentoggl-import.openapi.json` 必须先于 import transport 和 Web data access 定型。

**退出标准**

- 最小 Toggl 样本可导入并在主要 tracking 视图与 compat API 中可读
- ID mapping、失败明细、冲突诊断、可重试行为完整
- import continuation 使用真实 job runtime，不依赖人工补脚本
- import 页面族、诊断页和“最小样本导入成功” e2e 已对齐 stories

**强制测试链路**

- Domain Unit: mapping、conflict rule、state machine
- Application Integration: import phase 1/2、partial failure、retry
- Async Runtime: continuation、resume、idempotency
- Transport Contract: import API
- Frontend Feature: 上传/启动导入、查看诊断、重试
- Frontend Page Flow: import 页面族
- E2E: 导入一个最小样本并看到结果反馈
- Golden: import result payload

### Wave 9: Instance Admin / Platform Operations

**目标**

补齐 OpenToggl 作为一个实例可运行、可治理、可维护的宿主产品面。

**范围**

- `governance`
  - bootstrap
  - registration policy
  - instance user governance
  - config entry points
  - ops / health / diagnostics
  - security / audit
  - maintenance / read-only / job pause-resume
- OpenAPI
  - `opentoggl-admin.openapi.json`
- Web
  - bootstrap page
  - 注册策略页
  - 实例级用户治理页
  - 实例级配置页（SMTP / storage / payment / SSO / security）
  - 健康状态、系统状态、安全与审计页
  - 维护模式 / 只读模式 / 任务暂停恢复入口

**推荐并行 streams**

- `admin-bootstrap-governance` subagent
- `admin-ops-health` subagent
- `admin-web` subagent

**依赖**

- 依赖 Wave 0 platform runtime
- 依赖 Wave 1 identity/session
- 依赖 Wave 5/6/8 的异步系统状态接入
- `opentoggl-admin.openapi.json` 必须先于 admin transport 和 Web data access 定型。

**退出标准**

- 首个管理员 bootstrap 只能成功一次
- 注册策略、实例级用户治理、实例级健康与维护入口都具备正式产品表达
- 管理员不是业务对象超级后门；高权限操作有审计
- self-hosted 首次管理员初始化流程和实例级健康页已可用于容器化部署 smoke test

**强制测试链路**

- Domain Unit: bootstrap state、registration policy、maintenance state
- Frontend Unit: registration-policy adapter、instance config form adapter、health-status mapper
- Application Integration: create first admin、disable user、pause jobs、health summary
- Async Runtime: paused jobs / resumed jobs / diagnostic aggregation
- Transport Contract: admin API
- Frontend Feature: bootstrap、切换注册策略、暂停/恢复维护入口
- Frontend Page Flow: instance admin 页面族
- Golden: admin status / audit payload

### Wave 10: 兼容性收口与发布准备

**目标**

在全部产品面具备后，做一次跨产品面的行为收口，而不是再引入新功能。

**范围**

- 全局 URL state / query state / session state 一致性清理
- 共享 app shell、navigation、branding、feature gating 收口
- OpenAPI、golden、page flow、e2e 的缺口补齐
- 性能预算与全量测试预算压缩
- 文档、fixtures、seed、最低发布门槛复核

**推荐并行 streams**

- `compatibility-gap-closer` subagent
- `frontend-parity-closer` subagent
- `test-budget-hardening` subagent

**依赖**

- 依赖前九个波次全部完成。

**退出标准**

- 主要 PRD 用户故事都有明确验收链路
- Compat 输出都被 contract 或 golden 锁定
- 全量测试符合预算
- 无 API-only / Web-only 的残缺产品面
- `testing-strategy` 明确要求的 page flow 与 e2e 缺口清零或被显式降级批准
- self-hosted 交付物完整：镜像、compose、env 样例、迁移命令、初始化流程、持久化卷策略、升级/回滚说明
- 新环境按文档启动后，能通过 `health`、登录、进入 workspace、最小关键路径 smoke test
- 所有在 PRD 中有 Figma 原型的正式页面，都已有 `PRD -> Figma 节点 -> 实现页面 -> 测试` 对照结果

## 8. 贯穿全程的测试矩阵

每个波次都必须把用户故事映射到以下测试层，不允许只选其中一层充数：

- `Domain Unit`
  - 保护不变量、值对象、状态机、费率/时间/权限等基础规则。
- `Application Integration`
  - 保护事务边界、权限拒绝、job record、主要 query 语义。
- `Transport Contract`
  - 保护路径、参数、鉴权入口、错误码、响应 shape。
- `Async Runtime`
  - 保护 projector、delivery、retry、idempotency、continuation。
- `Frontend Unit`
  - 保护 formatter、mapper、URL adapter、form schema adapter。
- `Frontend Feature`
  - 保护单一高价值交互流程。
- `Frontend Page Flow`
  - 保护路由、search params、页面族装配和 reload/back-forward 一致性。
- `E2E`
  - 保护少量高价值跨层用户路径。
- `Compatibility Golden`
  - 锁定 Toggl compat 输出和 OpenToggl 自有正式输出。

默认验收门槛：

- 有 formal API 的能力必须有 contract test。
- 有 Toggl compat 输出的能力必须有 golden。
- 有 job/projector/delivery 的能力必须有 runtime test。
- 有正式页面族的能力必须有 page flow test。
- 高价值用户路径必须有 e2e。

每个波次还必须维护一份故事覆盖清单，最少包括：

- 已覆盖的 BDD 故事与对应测试层
- 尚未覆盖的故事
- 明确延期的故事与原因
- 对 `testing-strategy` 要求的 page flow / e2e 缺口状态

## 9. 统一依赖关系

全计划的核心依赖图如下：

1. Wave 0 为所有后续波次提供基础 runtime、目录、生成链路和测试骨架。
2. Wave 1 先落 identity/session/tenant/billing foundation，因为所有 workspace 级产品面都依赖登录态、租户关系和真实 feature gate / quota 事实来源。
3. Wave 2 再落 membership/catalog 完整产品面，因为 tracking、reports、webhooks 都依赖权限、目录对象和费率/成本规则。
4. Wave 3 先把 tracking 事实源打通，Wave 4-6 才能建立在同一事实之上。
5. Wave 5 reports 与 Wave 6 webhooks 都依赖 Wave 1 的 billing gate 事实和 Wave 3-4 的 tracking/governance 结果。
6. Wave 7 billing 只负责商业视图、发票与 customer 收口，不再承担前序波次的 gating 真相源职责。
7. Wave 8 import 依赖核心实体、tracking 事实源和 reports 可回读闭环。
8. Wave 9 instance-admin 依赖 platform、identity、filestore 与异步系统状态聚合。
9. Wave 10 只做收口，不引入新真相源。

## 10. 风险与控制策略

### 10.1 最大风险

- 过早并行导致共享层冲突，反而拖慢速度。
- 从 OpenAPI 反推测试设计，造成“接口很多但用户故事没验收”。
- 把 reports、webhooks、import 当成 CRUD 或脚本，绕开真实运行时。
- 让 Web 与 API 各自实现一套语义，导致兼容漂移。
- 测试数量增加后失控，突破 30s 预算。
- 一直到最后才考虑 self-hosted 交付，导致镜像、compose、迁移和初始化流程在发布前集中爆雷。
- 发布时只有源码，没有稳定的可运行 artifact 与 smoke gate。

### 10.2 对策

- 并行只在无重叠写集的任务之间发生；共享层先收口再扩散。
- 所有任务单必须写明服务的 PRD 用户故事与测试链路。
- 所有异步系统都必须通过同一 job runtime 与 record 机制落地。
- `packages/shared-contracts` 只承载公开合同类型、schema 和生成产物；view model 映射归位到 `entities`、`shared/forms`、`shared/url-state` 或 transport adapter，禁止 page 直连后端 DTO。
- 每个波次结束都执行一次测试预算检查，不把超时问题留到末尾。
- 从 Wave 0 起维护容器化交付链路，每个相关波次都跑 `compose + smoke`，不把部署问题留到 Wave 10。
- 发布准备必须产出镜像、compose、env 样例、迁移与初始化步骤，而不是只写“如何本地启动源码”。

## 11. 完成定义

只有同时满足以下条件，本计划才算完成：

- 所有正式产品面都已具备 API 与 Web 的完整表达。
- `Track API v9`、`Reports API v3`、`Webhooks API v1` 已以 contract + golden + 用户故事链路得到验证。
- `import` 与 `instance-admin` 已作为正式产品面上线，而不是脚本或手工流程。
- Web 页面族与 Figma/截图语义保持一致，没有私自改写产品语义。
- 所有高价值用户故事都有至少一条贯穿测试链路。
- `docs/testing/bdd-user-stories.md` 中的已承诺故事都已有覆盖、明确延期批准或被正式移除。
- 前后端已有正式生产构建与容器镜像，self-hosted 可通过 `docker compose` 启动。
- 新环境按文档执行迁移、初始化后，可完成 health check、登录、进入 workspace 和最小关键路径 smoke test。
- 全量测试可在本地快速运行并维持预算。
- 剩余问题仅限已记录、可接受、且不违反公开契约的缺口。

## 12. 执行备注

执行本计划时，主 agent 应默认采用 subagent-driven-development：

- 先按波次拆出任务包，而不是一次性让单个 agent 吞下整个产品面。
- 同一时间只让 subagent 处理明确、边界清晰、写集不冲突的任务。
- 每个任务完成后，先过 spec review，再过 quality review，再进入下一任务。
- 不要让 subagent 自己重新读整份计划；由 orchestrator 提供该任务所需的最小上下文。

本文件是完整实施蓝图，不是逐条勾选式施工单。真正执行时，应基于本计划按波次再拆成更小的 task packet 交给 subagent。
