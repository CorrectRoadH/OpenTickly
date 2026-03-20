# OpenToggl 完整实现计划

> **硬约束**
>
> 1. 本计划的开发执行必须由 subagent 完成，主 agent 只负责编排、依赖管理、review gate、汇总验收与合并决策。
> 2. 所有实现任务必须按 TDD 执行：先写失败测试，再写最小实现，再补重构与回归保护。
> 3. 任何正式产品能力都不能以 “先 API-only” 或 “先 Web-only” 方式落地；该能力所属波次必须同时完成对应 API、Web、测试链路。
> 4. self-hosted 不是发布后的附加脚本；从 Wave 0 起就必须作为正式交付目标推进，最终必须具备可构建、可启动、可验证的容器化交付物。

**Goal:** 在当前 starter 仓库上，按文档定义实现一个与 Toggl 当前公开产品面兼容的 OpenToggl v1，覆盖 Track API v9、Reports API v3、Webhooks API v1、对应 Web 界面，以及 OpenToggl 自有的 `import` 与 `instance-admin` 产品面。

**Architecture:** 采用单体优先架构，一个 Go `apps/backend` 进程加一个 React `apps/website` 应用；后端按 `transport -> application -> domain` 和固定限界上下文拆分，前端按 `app/routes/pages/features/entities/shared` 拆分。事务写模型以 PostgreSQL 为真相源，报表与异步投递通过 in-process job runner 与投影读模型完成。

**Tech Stack:** Go + Echo + oapi-codegen + pgx + PostgreSQL + Redis；React + Vite+ + Tailwind CSS 4 + TanStack Router + TanStack Query + react-hook-form + zod + baseui + styletron。

---

## 0. 执行 Todo

> 说明：
>
> - `- [x]` 表示已通过当前波次 gate，可视为本计划当前已完成部分。
> - `- [ ]` 表示未完成，其中包含“未开始”和“进行中”两类；进行中的细项会在条目文字里标明。
> - 这里的勾选状态用于执行追踪，不替代下面各波次的正式 `退出标准` 与全局测试要求。

> 开始任何未完成 TODO 前，必须先按对应类别阅读以下文档入口：
>
> - Wave 级产品实现 TODO：先读对应 `docs/product/*.md`，再读 `docs/core/architecture-overview.md`、`docs/core/codebase-structure.md`、`docs/core/backend-architecture.md`、`docs/core/frontend-architecture.md`、`docs/core/testing-strategy.md`，最后下钻到对应 `openapi/*.json` 与 Figma。
> - 测试计划与故事清单 TODO：先读 `docs/core/testing-strategy.md`、`docs/testing/bdd-user-stories.md`，再回看对应产品 PRD / OpenAPI / Figma。
> - 自部署与发布交付链路 TODO：先读 `docs/core/architecture-overview.md`、`docs/core/codebase-structure.md`、`docs/self-hosting/docker-compose.md`、`docs/product/instance-admin.md`，再读受影响波次的产品文档与 OpenAPI。
> - 若某项 TODO 进入实际执行，必须在对应 task packet 中继续明确写出 `PRD`、`Core Docs`、`OpenAPI Source`、`Figma Reference`，不能只引用这里的总入口。
>
> 执行优先级补充：
>
> - 结构收口、技术债治理、启动/交付链路修正的优先级高于继续增加功能面。
> - 如果基础结构仍在漂移，不允许以“先做功能、后面再整理”为理由跳过结构治理。

- [x] Wave 0：工程地基与生成链路
  - [x] `apps/backend`、`apps/website`、`packages/web-ui`、`packages/shared-contracts` 基线落地
  - [x] `opentoggl-web` / `opentoggl-import` / `opentoggl-admin` 初始合同骨架落地
  - [ ] `vp test`、`vp check`、`go test ./apps/backend/...` 当前可通过
- [x] 本地开发基线
  - [x] 本地开发采用仓库根目录源码启动链路，前后端可分别启动并共享根目录 env
  - [x] 本地开发 env 文件统一收口到仓库根目录，例如 `.env.example`、`.env.local`
  - [x] 不允许新增根级 `scripts/*.sh` 作为本地开发入口，新增入口统一收口到 root toolchain 或正式 CLI
- [ ] Wave 1：Identity、Session、Tenant、Billing Foundation 与应用壳
  - [x] Wave 1 Web 合同扩展：`openapi/opentoggl-web.openapi.json`
  - [x] `billing-foundation` 后端基础切片第一版
  - [x] `tenant-backend` 后端基础切片第一版
  - [x] `identity-backend` 切片完全过 gate
  - [x] `identity-tenant-web` 切片完全过 gate
  - [x] 登录页补齐可发现的注册入口与跳转，避免 `/login` 成为注册流程死路
  - [ ] Wave 1 整体退出标准全部满足
- [ ] Wave 2 前结构与交付基线收口 gate
  - [x] 在进入 Wave 2 前完成后端目录结构收口：`apps/backend/main.go + apps/backend/internal/*`。Refs: `docs/core/codebase-structure.md`、`docs/core/backend-architecture.md`
  - [x] 在进入 Wave 2 前完成后端启动命令收口：`go run ./apps/backend`。Refs: `AGENTS.md`、`docs/core/codebase-structure.md`
  - [ ] 在进入 Wave 2 前完成 self-hosted 单镜像运行时方向收口，不再以 `website + api` 双运行时作为目标形态。Refs: `docs/core/architecture-overview.md`、`docs/self-hosting/docker-compose.md`
  - [ ] 在进入 Wave 2 前完成相关文档、README、样例命令与 smoke test 口径统一。Refs: `AGENTS.md`、`README.md`、`docs/self-hosting/docker-compose.md`
  - [x] 执行 TODO：后端目录结构从 `apps/api + backend/internal/*` 收口为 `apps/backend/main.go + apps/backend/internal/*`。Refs: `docs/core/codebase-structure.md`、`docs/core/backend-architecture.md`
  - [x] 执行 TODO：本地开发与文档启动命令统一收口为 `go run ./apps/backend`，不再使用 `go run ./apps/api/cmd/api`。Refs: `AGENTS.md`、`docs/core/codebase-structure.md`
  - [ ] 执行 TODO：同步修正文档、README、样例命令和 smoke test，避免继续出现 `apps/api`、`backend/internal/*`、`website + api` 双运行时表述。Refs: `README.md`、`docs/core/architecture-overview.md`、`docs/self-hosting/docker-compose.md`
  - [x] 执行 TODO：修正根 `package.json` 的 `dev:api` 等旧命令引用，确保根工具链不再指向 `apps/api/cmd/api`。Refs: `AGENTS.md`、`docs/core/codebase-structure.md`
  - [x] 执行 TODO：处理遗留 `apps/api` 目录，明确哪些测试/脚本迁移到 `apps/backend`，哪些删除，禁止长期并存两个后端应用目录。Refs: `docs/core/codebase-structure.md`、`docs/core/testing-strategy.md`
  - [x] 执行 TODO：将 `apps/api/tests/compat`、`apps/api/tests/golden`、`apps/api/tests/openapi` 收口到与 `apps/backend` 一致的位置，避免测试资产继续绑定旧目录。Refs: `docs/core/testing-strategy.md`、`docs/core/backend-architecture.md`
  - [x] 执行 TODO：评估 `apps/api/package.json`、`apps/api/scripts/generate-openapi-test-artifacts.mjs`、`apps/api/src/testing/*` 的归属，迁移到 `apps/backend` 或共享工具目录，避免旧应用壳残留。Refs: `docs/core/backend-architecture.md`、`docs/core/codebase-structure.md`
  - [ ] 执行 TODO：修复 `apps/backend` 作为 JS/Vitest 工具入口后的测试启动问题，确保目录收口后 `vp test run` 不因 toolchain/config 漂移失效。Refs: `docs/core/testing-strategy.md`、`docs/core/codebase-structure.md`
  - [ ] 执行 TODO：收口 `pnpm-lock.yaml` 与 workspace 元数据，移除旧 `apps/api` workspace 残留，确保安装链路不再提示 broken lockfile 或旧应用目录记录。Refs: `docs/core/codebase-structure.md`
  - [ ] 执行 TODO：梳理当前 `docker-compose.yml`、`docker/api.Dockerfile`、`docker/website.Dockerfile`、`docker/nginx/website.conf` 的职责，标记哪些保留、哪些删除、哪些迁移。Refs: `docs/self-hosting/docker-compose.md`、`docs/core/architecture-overview.md`
  - [ ] 执行 TODO：移除或替换根级 shell 验证脚本（如 self-hosted smoke 验证脚本），将对应验证入口收口到 root toolchain 或正式 CLI，避免继续依赖 `scripts/*.sh`。Refs: `AGENTS.md`、`docs/core/codebase-structure.md`、`docs/self-hosting/docker-compose.md`
  - [ ] 将当前 self-hosted 实现收口到单应用镜像，移除独立 `website` / Nginx 运行时依赖。Refs: `docs/core/architecture-overview.md`、`docs/self-hosting/docker-compose.md`
  - [ ] TODO: 删除与目标形态冲突的 `docker/website.Dockerfile`、Nginx 配置与 compose service，或将其降级为仅调试/过渡用途并明确标注。Refs: `docs/self-hosting/docker-compose.md`
  - [ ] 执行 TODO：删除 `docker/website.Dockerfile` 与 `docker/nginx/website.conf`，若短期不能删则必须改名或在文档中明确标注为过渡态，禁止继续作为目标发布方案。Refs: `docs/self-hosting/docker-compose.md`
  - [ ] 生产构建可生成稳定单镜像，而不是依赖开发态启动。Refs: `docs/core/architecture-overview.md`、`docs/self-hosting/docker-compose.md`
  - [ ] TODO: `apps/website` 产物构建与 `go:embed` 打包链路正式化，避免发布态重复维护前端容器。Refs: `docs/core/architecture-overview.md`、`docs/core/codebase-structure.md`
  - [ ] 执行 TODO：在 `apps/website` 产物构建完成后，由 `apps/backend` 构建链路把前端静态资源复制到可 `go:embed` 的目录，并保证本地开发链路不依赖该步骤。Refs: `docs/core/architecture-overview.md`、`docs/core/backend-architecture.md`
  - [ ] TODO: 后端补齐 SPA 静态资源服务、history fallback 和与 `/web/v1/*` 共存的路由规则。Refs: `docs/core/backend-architecture.md`、`docs/self-hosting/docker-compose.md`
  - [ ] 执行 TODO：在 Go HTTP 入口实现静态资源服务、SPA history fallback、根路径 `/` 与静态资源缓存策略，同时保持 `/web/v1/*`、`/healthz`、`/readyz` 路由不回退到前端。Refs: `docs/core/backend-architecture.md`、`docs/self-hosting/docker-compose.md`
  - [ ] 执行 TODO：新增或收口单镜像 `Dockerfile`，镜像内只运行一个 `opentoggl` 进程，不再要求 Nginx sidecar 或独立 website runtime。Refs: `docs/core/architecture-overview.md`、`docs/self-hosting/docker-compose.md`
  - [ ] `docker compose` 自托管启动链路收口为 `opentoggl + postgres + redis`。Refs: `docs/self-hosting/docker-compose.md`
  - [ ] 执行 TODO：重写 `docker-compose.yml`，删除 `website` service，保留 `opentoggl + postgres + redis`，并更新 healthcheck、端口、env 与 volume 说明。Refs: `docs/self-hosting/docker-compose.md`
  - [ ] 执行 TODO：处理当前真实偏移中的 `docker/api.Dockerfile` 命名与职责问题，决定是迁移为 `docker/backend.Dockerfile` 还是收口为单一发布 Dockerfile，避免目录/镜像语义继续停留在旧 `api` 命名。Refs: `docs/core/architecture-overview.md`、`docs/self-hosting/docker-compose.md`
  - [ ] 执行 TODO：决定是否保留 `dev:api` 作为兼容别名；若保留需明确过渡期限，若不保留则同步删除相关旧别名文档与命令。Refs: `AGENTS.md`、`README.md`、`docs/core/codebase-structure.md`
  - [ ] 执行 TODO：在 README 或 self-hosting 文档中补一句“当前目标态为单镜像，仓库实现仍在从旧双运行时收口中”，避免使用者把现存 Docker 文件误读为最终方案。Refs: `README.md`、`docs/self-hosting/docker-compose.md`
  - [ ] 该 gate 未完成前，不允许继续推进 Wave 2 及之后波次的正式功能扩展
- [ ] Wave 2：Membership、Access、Catalog 完整产品面（进行中：已完成首个 contracts + backend core + web pages + runtime endpoints slice；前提：先通过“Wave 2 前结构与交付基线收口 gate”）
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
  - [ ] 建立 `BDD Story -> Test Coverage` 对照清单：逐条映射 `docs/testing/bdd-user-stories.md` 到 `Domain Unit / Application Integration / Transport Contract / Frontend Feature / Frontend Page Flow / E2E / Golden`，标记 `已覆盖 / 部分覆盖 / 缺失`，并把缺口作为后续波次阻塞项管理
  - [ ] 每个 Wave 开始前，把对应产品面的故事映射到 `Domain / Integration / Contract / Feature / Page Flow / E2E / Golden`
  - [ ] 每个 Wave 结束时，更新“已覆盖故事 / 未覆盖故事 / 延后原因”清单
  - [ ] Wave 10 前补齐 `testing-strategy` 明确要求但尚未实现的 page flow 与 e2e
  - [ ] 为每个正式页面族建立 `PRD -> Figma 节点 -> 页面实现 -> page flow/e2e` 对照清单
- [ ] 自部署与发布交付链路（其中结构与运行时收口部分必须在 Wave 2 前完成）
  - [x] 明确 self-hosted 目标交付形态：单 Go 应用镜像，构建时内嵌前端 `dist`，由同一运行时同时提供 Web UI 与 API
  - [ ] 数据库迁移、首次管理员初始化、默认配置注入有正式流程
  - [ ] 健康检查、readiness、基础日志与最小 smoke test 固定
  - [ ] 升级/回滚步骤、持久化卷和必要环境变量文档化
  - [ ] 执行 TODO：补齐单镜像发布链路验证，至少覆盖镜像构建、容器启动、首页可达、SPA 路由可达、`/web/v1/session`、`/healthz`、`/readyz`
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
- `apps/backend`、`packages/web-ui`、`packages/shared-contracts` 仍不存在。
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
  - 可启动的 self-hosted `docker compose` 栈
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

每个开发任务开始前，`Orchestrator` 必须准备一个明确的 task packet。最少包含：

1. 任务名称、目标、产品面
2. 对应 PRD、core docs、OpenAPI、Figma/fallback 骨架来源
3. 用户故事与对应测试层
4. 文件 ownership 与禁止触碰范围
5. 验收命令与完成定义

每个 implementer 的交付最少包含：

1. 负责文件清单
2. 失败测试证据
3. 最小实现说明
4. 回归测试与验证命令结果
5. 剩余风险

缺少失败测试证据或本地验证结果，视为未完成。

### 4.4 每个任务的 gate

每个任务完成顺序固定为：

1. 写失败测试
2. 写最小实现并跑通
3. implementer 自检
4. orchestrator 集成 review
5. spec / quality review
6. 决定合并或打回

`orchestrator` review 是硬 gate，重点只看五件事：

- 是否超出 task packet 范围
- 是否破坏依赖方向或模块边界
- 是否把业务语义错误地下沉到共享层或 generated artifacts
- 是否引入明显坏味道或临时实现
- 当前仓库是否仍处于可继续集成状态

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

每个波次默认按以下顺序启动：

1. 提炼故事与测试映射
2. 收口合同边界
3. 后端实现
4. 前端实现
5. review 与验收

前两步未完成，不开始功能实现。

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

波次默认规则：

- 前端页面遵循 §3.2.1 的 Figma 对齐约束，不再在各 Wave 重复展开
- 测试遵循 §8 的统一测试矩阵
- 公开接口遵循合同优先：先更新 OpenAPI，再生成边界，再进入实现
- 只有明显横切能力才允许先于产品波次单独建设

## 7. 波次规划

### Wave 0: 工程地基与生成链路

**目标**

把仓库从 Vite starter 演进到可承载正式产品开发的 monorepo 基线。

**范围**

- 建立 `apps/backend`
- 建立 `apps/backend/main.go`、`apps/backend/internal/bootstrap`、`apps/backend/internal/http`、`apps/backend/internal/web`
- 建立 `apps/backend/internal/*` 模块骨架与 `platform` 基础设施骨架
- 建立 PostgreSQL Blob `filestore` 抽象、blob 表与平台 wiring，作为 logo/avatar、expense attachment、report export、invoice artifact、import archive 的统一基础
- 把 `apps/website` 重构成 React + Router + Query 正式入口
- 把 `tailwindcss@4` 接入正式前端 runtime，并明确它与 `baseui/styletron` 的分工
- 建立 `packages/web-ui`、`packages/shared-contracts`
- 建立 compat OpenAPI 生成、contract test、golden test 骨架
- 建立 Web 自定义 OpenAPI：`opentoggl-web`、`opentoggl-import`、`opentoggl-admin`
- 建立 feature gate / quota / capability check 的统一接口边界，但在 Wave 7 之前只允许提供最小占位实现，不允许把 gate 规则散落到业务模块
- 建立最小测试脚手架与统一门禁
- 建立本地开发基线：仓库根目录源码启动、根目录 env 约定、无根级本地开发 shell 包装
- 建立 self-hosted 容器化交付骨架：生产构建、Dockerfile、compose、health/readiness、基础 smoke 脚本

**推荐并行 streams**

- `api-foundation` subagent
  - `apps/backend`
  - `apps/backend/internal/platform`
  - `apps/backend/internal/bootstrap` / `http` / `web`
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
  - self-hosted `docker compose` 基线
  - health/readiness 与最小 smoke 命令
  - env/volume/migration/init 约定

**依赖**

- 无上游实现依赖，是全计划的起点。

**退出标准**

- 根目录、API、Web 都能启动最小正式 runtime
- 本地开发可从仓库根目录分别启动前端与后端源码进程，不依赖 `docker compose`
- 本地开发 env 已统一收口在仓库根目录，而不是分散在 `apps/*`
- 本地开发入口未退化为根级 `scripts/*.sh` 包装
- Web 端已完成 `tailwindcss@4 + baseui + styletron` 的共存基线，而不是后续再补
- OpenAPI 生成链路可用
- compat 与 `opentoggl-*` 自定义合同都已有最小可生成骨架
- capability check / feature gate 只有统一入口，没有散落在各模块里的硬编码分支
- PostgreSQL Blob `filestore` 已可被应用层通过统一接口消费，而不是等附件类功能出现时再补
- 测试目录、命名、最小 fixture 和并发策略固定
- `docs/testing/bdd-user-stories.md` 已成为测试设计输入，而不是只留在会话中
- 至少有一套可构建的 API/Website 生产镜像骨架与 self-hosted `docker compose` 启动基线
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

**退出标准**

- 用户可以进入 workspace
- 当前用户与 workspace 设置能通过 API 与 Web 读取、更新
- organization / workspace 管理、logo / avatar 入口已具备正式页面与合同支撑
- 停用用户会被阻止继续登录和继续写业务数据
- 停用中的 running timer 自动停止语义有测试覆盖
- feature gate、quota header 与 capability check 已由 billing 提供正式事实来源，不再允许“默认全开占位实现”
- Wave 1 范围内的 BDD 故事已映射到 page flow / e2e / contract / integration
- self-hosted `docker compose` 基线可启动 Wave 1 所需服务，并完成 login + shell + health smoke test
- `profile`、`settings`、共享 app shell 的正式 UI/Figma 对齐在 Wave 1.5 收口

### Wave 1.5: UI / Figma 对齐修复

**目标**

在继续扩张 Wave 2 页面族之前，先收口已经出现的 Web UI 漂移，确保共享应用壳、`profile`、`settings` 和后续会复用的页面基线真正按 PRD/Figma 落地，而不是继续建立在占位式页面骨架之上。

**范围**

- 共享 app shell
  - 以 `docs/product/tracking.md` 中的 Figma `left nav` 节点 `8:2829` 为输入
  - 收口 left nav、workspace switcher、profile/admin 入口、workspace 上下文区、loading/error/empty 状态
  - 删除开发期 hero、Wave 文案、placeholder/contract-backed/tracer shell 叙事
- `profile`
  - 以 `docs/product/identity-and-tenant.md` 中的 Figma `profile` 节点 `10:14814` 为输入
  - 先对齐页面信息架构、主次区域、账户级状态区、偏好区、token/security 入口，再补细节字段
- `settings`
  - 以 `docs/product/identity-and-tenant.md` 中的 Figma `settings` 节点 `11:3680` 为输入
  - 先对齐 workspace / organization 设置页面的区域切分、导航关系、branding 入口和正式设置骨架
- `packages/web-ui`
  - 从当前最小 theme/panel/button 基线扩到正式共享 UI 基线
  - 至少补齐 page shell、section header、form field shell、notice/empty/error/loading state、nav item、list/table shell
  - 明确 `tailwindcss@4` 与 `baseui/styletron` 的使用边界，避免页面各写一套视觉语言
- Figma 对齐证据
  - 为 `shell`、`profile`、`settings` 建立 `PRD -> Figma 节点 -> 实现页面 -> page flow/e2e -> 截图/证据` 对照结果
  - 对 `project/client/tag` 与成员/权限相关页面补“当前 Figma/fallback 骨架来源”清单，禁止继续以 placeholder 页面扩张功能

**推荐并行 streams**

- `shell-parity-recovery` subagent
- `identity-settings-parity` subagent
- `web-ui-baseline-hardening` subagent
- `figma-parity-evidence` subagent

**依赖**

- 依赖 Wave 1 的 identity、tenant、session、workspace settings 与共享 app shell 基线。
- 本波次完成前，不得把 `project / client / task / tag / members / permission` 等正式页面继续建立在占位式信息架构上扩张。

**退出标准**

- 共享 app shell 的信息架构、导航关系和状态区域与 Figma `left nav` 语义一致，不再保留开发期说明文案
- `profile` 与 `settings` 页面已按各自 Figma 节点完成正式页面骨架对齐，而不是卡片堆叠式占位表单
- `packages/web-ui` 已形成可复用的应用级 UI 基线，而不是仅有 theme/panel/button 的极薄封装
- loading / error / empty / success notice 等关键状态已统一进入共享 UI 基线，不再由各页面临时拼接
- `shell`、`profile`、`settings` 已提交 `PRD -> Figma 节点 -> 实现页面 -> 测试 -> 截图/证据` 对照结果
- Wave 2 将要扩张的正式页面已补齐各自的 Figma 引用或 fallback 骨架来源，未再保留“placeholder slice”作为完成依据

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

- 依赖 Wave 1 与 Wave 1.5 的 identity、tenant、session、workspace settings 和 UI 基线。

**退出标准**

- 权限模型以数据和合同生效，而不是只靠 UI 隐藏
- 私有项目的可见性和可写性在 API、Web、报表入口前置校验上保持一致
- 费率与成本字段已成为 tracking / reports 的可用输入
- project / client / task / tag 已完成正式产品面对齐，包括 CRUD、archive/restore、pin/unpin、模板和 stats/periods
- 费率 / 成本设置页与权限配置页已具备正式页面、合同与测试覆盖
- Wave 2 范围内的故事覆盖状态已更新到测试故事清单
- `project page`、`client page` 以及成员/权限相关正式页面已引用 PRD/Figma 或明确 fallback 骨架，并提交对齐结果

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

**退出标准**

- 同一份 tracking 事实同时驱动 list、calendar、timesheet
- running timer 冲突规则固定且有回归保护
- `start/stop/duration` 非法组合返回固定错误
- since sync 与主要过滤在 compat API 与 Web 行为上对齐
- Wave 3 对应的 `timer` 页面族 page flow 与核心 e2e 已按 testing-strategy 落地
- `calendar`、`list`、`timesheet` 三个正式视图已引用对应 Figma 节点，并证明它们共享同一页面族语义

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

**退出标准**

- approval / expense 状态机固定
- 审批权限、编辑回退到 `reopened` 等规则在 API 与 Web 一致
- 附件、汇率快照、历史结果冻结语义完整
- Wave 4 覆盖状态已回填到测试故事清单，并标明剩余缺口

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

**退出标准**

- 在线查询、导出、saved report、shared report 使用同一套权限与过滤语义
- 报表与 tracking 的历史事实解释一致
- 汇率、rounding、profitability 规则在 shared/export/online 三者一致
- 报表页面族 page flow、导出 golden 与至少一条高价值 e2e 已对齐 stories

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

**退出标准**

- validate/ping 与真实 delivery 共享运行时，但状态可区分
- retry / disable / limits / status 是正式运行时行为，不是管理脚本
- 私有项目和权限变化会影响后续事件暴露
- Webhooks 页面族、runtime test 与基础验证 e2e 已按 stories 覆盖
- `integrations webhooks` 页面已引用 PRD 中的 Figma 节点并提交对齐结果

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

**退出标准**

- 最小 Toggl 样本可导入并在主要 tracking 视图与 compat API 中可读
- ID mapping、失败明细、冲突诊断、可重试行为完整
- import continuation 使用真实 job runtime，不依赖人工补脚本
- import 页面族、诊断页和“最小样本导入成功” e2e 已对齐 stories

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

**退出标准**

- 首个管理员 bootstrap 只能成功一次
- 注册策略、实例级用户治理、实例级健康与维护入口都具备正式产品表达
- 管理员不是业务对象超级后门；高权限操作有审计
- self-hosted 首次管理员初始化流程和实例级健康页已可用于容器化部署 smoke test

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
- 前后端已有正式生产构建与容器镜像，self-hosted 可通过 `docker compose` 启动；本地开发默认仍以前后端源码进程方式运行。
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
