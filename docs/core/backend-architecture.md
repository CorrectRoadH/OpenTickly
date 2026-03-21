# OpenToggl 后端架构

本文档定义后端模块如何在单体中落地，重点回答：

- 每个业务模块内部怎样组织
- command / query / transport / composition 怎么分
- 事务、权限、异步 job、projector、delivery runtime 放哪
- 跨模块如何协作，哪些依赖不允许出现

系统级蓝图以 `docs/core/architecture-overview.md` 为准；本文档负责把它落到代码结构。

本文件强依赖以下上游定义：

- `docs/core/product-definition.md`
- 对应 `docs/product/*.md`
- `docs/core/domain-model.md`
- `docs/core/architecture-overview.md`

约束：

- 本文件只能把这些上游定义落成代码结构、模块协作和运行时规则。
- 本文件不得反向发明或改写领域边界、对象归属、聚合根或关键不变量。

## 0. OpenAPI 的来源与作用边界

当前仓库里已经存在的 OpenAPI 来源有 3 份：

- `openapi/toggl-track-api-v9.swagger.json`
- `openapi/toggl-reports-v3.swagger.json`
- `openapi/toggl-webhooks-v1.swagger.json`

它们分别对应 Toggl 官方兼容面：

- `Track API v9`
- `Reports API v3`
- `Webhooks API v1`

除此之外，项目后续还应新增 3 份 OpenAPI，用于 OpenToggl 自定义能力：

- `openapi/opentoggl-web.openapi.json`
- `openapi/opentoggl-import.openapi.json`
- `openapi/opentoggl-admin.openapi.json`

职责划分：

- `toggl-*`：外部兼容承诺来源
- `opentoggl-web`：Web 前端自有后台接口
- `opentoggl-import`：导入产品面与 job 编排接口
- `opentoggl-admin`：实例管理、治理、运营接口

规则：

- `transport/http/compat` 只吃 `toggl-*`
- `transport/http/web` 只吃 `opentoggl-web`、`opentoggl-import`、`opentoggl-admin`
- 不允许把 OpenToggl 自定义管理接口混进 Toggl compat OpenAPI
- 不允许把 import API 塞进 admin，除非只是复用底层用例而不是复用公开合同

后端不能“从 OpenAPI 生成架构”，但必须“从 OpenAPI 生成边界要求”。

对所有 OpenAPI 来源来说，`openapi/*.json` 是以下内容的输入来源：

- transport DTO
- handler / route stub
- 参数校验要求
- contract test / golden test skeleton
- endpoint 到模块 / use case 的映射清单

`openapi/*.json` 不是以下内容的直接来源：

- domain 模型
- command / query 划分
- 事务边界
- 权限规则
- job / projector / delivery runtime 设计

因此流程固定为：

1. 从 OpenAPI 生成 transport / contract 要求
2. 由人工把 endpoint 映射到模块与 use case
3. 由实现层决定 domain、application、infra 如何协作

## 0.5 后端技术栈与框架结论

后端文档必须明确到可执行工程决策，而不是只停留在抽象分层。

当前目标态的正式结论如下：

- HTTP runtime：`echo`
- compat 路由与 handler interface：由 `oapi-codegen` 基于 OpenAPI 全生成
- compat request/response validation：由 OpenAPI 生成链路与 `kin-openapi` 驱动
- Web/internal API runtime：可继续挂在同一 `echo` 实例上，但不反向污染 compat transport
- OpenAPI 生成代码：`oapi-codegen`，以 compat transport 为最高优先级生成目标
- 数据库：`PostgreSQL`
- 数据库访问：`pgx`
- PostgreSQL schema 管理：`pgschema`（声明式 desired-state SQL + `plan/apply` 工作流）
- 事务：显式 `pgx.Tx`
- Redis：官方 Redis client，由 `platform` 提供连接与最小封装
- 依赖注入：手写 constructor wiring，不使用运行时 DI 容器，不使用代码生成式 DI
- 后台 job runner：进程内 runner + PostgreSQL job record

解释：

- compat API 的主要风险不是“框架选错”，而是人工手写路由、参数绑定、校验和响应 shape 后逐步偏离 OpenAPI。
- 因此 compat API 采用 generation-first：OpenAPI 决定路由、参数、DTO、handler interface、validator 与 contract skeleton，人工不再手写这些边界。
- 在这个前提下，`echo` 的价值是作为成熟的 transport runtime 承载生成产物，而不是承载业务语义。
- `echo` 只能停留在 `transport` 与 `apps/backend/internal/http`；`application`、`domain`、`infra` 不得依赖 `echo.Context` 或任何 `echo` 类型。
- DI 明确采用手写装配，而不是 `fx`、`wire`、`dig` 这类容器或生成器；本项目需要的是清晰依赖图、可审查的启动顺序和显式模块边界，而不是额外框架语义。
- OpenAPI 仍然只生成 transport/contract 边界，不生成 domain/application/infra。

## 0.5.1 PostgreSQL Schema SSOT 与 `pgschema` 工作流

PostgreSQL schema 管理必须是单一路径。

固定结论如下：

- PostgreSQL schema 的唯一真相源是仓库内受版本控制的 `pgschema` desired-state SQL。
- `pgschema` 是唯一允许的正式 schema 管理器；不再维护第二套长期并行的 migration 编号体系、ORM auto-migrate 或 ad hoc DDL 工作流。
- `pgschema dump` 只用于导入现状、调试或事故分析，不作为日常变更的真相源。
- 日常 schema 变更工作流固定为：修改 desired-state SQL -> `pgschema plan` -> review plan 输出 -> `pgschema apply`。
- `pgschema plan` 的输出属于 code review 与部署 review 证据的一部分；不能跳过 plan 直接在数据库里手写 DDL。
- `pgschema apply` 可以在本地开发、自托管部署和 CD 中使用，但都必须以仓库里的同一份 desired-state SQL 为输入。

推荐目录归属：

```text
apps/backend/internal/platform/
  schema/
    schema.sql
    blobs.sql
    jobs.sql
    bootstrap.sql
    .pgschemaignore
```

规则：

- `platform/schema/` 负责 PostgreSQL 结构定义，不承载业务 command/query 逻辑。
- schema 文件可以按对象族拆分，但合起来必须仍然表达完整 desired state。
- Blob、job record、bootstrap guard、平台级元数据等共享基础表归 `platform/schema/`。
- 具体业务表以后分别由各模块 ownership 维护，但仍通过 `pgschema` 汇总到同一 desired state。
- 不允许在模块内部偷偷引入第二套 schema 入口，例如 `gorm.AutoMigrate()`、运行时即兴 `CREATE TABLE` 或脱离 `pgschema` 的独立 migration CLI。

环境约定：

- 应用运行时继续使用 `DATABASE_URL` 作为 Go 后端的主 DSN 输入。
- `pgschema` 命令使用标准 PostgreSQL CLI 环境：`PGHOST`、`PGPORT`、`PGDATABASE`、`PGUSER`、`PGPASSWORD`、`PGSSLMODE`。
- 如果仓库根 `.env.local` 同时提供了应用运行时 env 与 `pgschema` 所需 PG* env，它们必须指向同一个数据库实例，不允许形成两套数据库目标。

工作流约定：

- 本地开发：修改 schema SQL 后，先运行 `pgschema plan`，确认 plan 正确，再运行 `pgschema apply`，最后启动或重启 `air` 做真实运行时验证。
- CI：对 schema 相关变更至少运行一次 `pgschema plan`，并把 plan 结果作为 review 证据。
- CD / self-hosted：部署流程在应用对外 ready 之前执行 `pgschema apply --auto-approve` 或等价的受控 apply 步骤。
- 回滚：优先通过 Git 回退 desired-state SQL 后重新执行 `pgschema plan/apply`；如果变更涉及不可逆破坏性 DDL，必须在 review 阶段提前标注和制定数据恢复方案。

## 0.6 为什么是手写 DI

本项目的依赖注入目标不是“可配置”，而是：

- 让 `application` 能在测试里直接替换 port
- 让 `transport` 能在不启动整站的情况下单独挂到测试 server
- 让 `apps/backend/internal/bootstrap` 成为唯一装配真相源
- 让 review 时能直接看出一个 endpoint 穿过哪些模块
- 让启动顺序中的副作用步骤保持显式可读：`connect postgres/redis -> pgschema reconcile -> bootstrap/init guard -> build services -> start http`

因此这里不采用 `fx` 的原因不是“它不好”，而是它解决的主要问题与本项目当前约束不匹配。

对本项目来说，`fx` / `dig` / `wire` 的主要问题是：

- 会把依赖关系的一部分隐藏到 provider graph、annotation 或 lifecycle hook 中，削弱 `bootstrap` 作为装配 SSOT 的可读性
- 容易把“可以注入”误当成“应该依赖”，放松模块边界，增加跨上下文耦合的机会
- 会把启动时序和对象构造混在一起；而本项目恰恰要求 schema apply、bootstrap guard、readiness gate 这些副作用步骤保持显式顺序
- 会让 code review 更难直接回答“这个 endpoint 穿过了哪些 repo/query service/job runner”
- 对当前阶段的模块规模来说，引入容器语义的复杂度大于收益

特别是 `fx`：

- `fx` 更适合需要大量可插拔 provider、复杂模块生命周期和长期容器化装配约定的大型服务
- 当前仓库更需要显式、稳定、可逐行审查的构造顺序，而不是运行时容器帮我们“推导出一个图”
- 如果未来真的出现几十个独立模块、多个独立启动 profile、重复的生命周期编排痛点，再重新评估也不迟；但那必须是显式架构决策，不是为了少写几行 wiring 代码就提前引入

结论：

- `fx` 不是禁止讨论的工具，但不是当前仓库的推荐方案
- 当前正式路径固定为：显式 constructor + 手写 bootstrap wiring
- 除非先更新架构文档并明确说明为什么手写装配已经不再满足需求，否则不引入 `fx`、`dig`、`wire` 或类似容器

因此固定规则如下：

- 每个 `application` 用例通过显式构造函数接收依赖
- `application` 只依赖自己声明的 port、时钟、idempotency、authz/query 接口
- `infra` 实现 port，但不反向持有 service locator
- `apps/backend/internal/bootstrap` 负责创建数据库连接、Redis 连接、repo、query service、job runner、handler
- `apps/backend/internal/bootstrap` 负责在正式启动链路中调用 `pgschema` 所管理的 schema reconcile / apply 步骤，并在该步骤失败时立即启动失败
- `transport/http/*` 只接收已经构造好的 use case / query handler / auth context decoder
- 不允许在 handler 内临时 `new` repository
- 不允许在 `domain` 或 `application` 里读取全局单例
- 源码本地开发默认必须通过根目录 `.env.local` 提供数据库/缓存等关键配置；缺少关键 env 时，`bootstrap` 必须失败，不允许伪造可工作默认值
- `apps/backend/internal/bootstrap` 必须把真实 Postgres / Redis 连接失败视为启动失败；不允许把内存 store、placeholder runtime 或 fake dependency 当成默认装配路径

推荐装配形状：

```text
apps/backend/internal/bootstrap/
  config.go
  database.go
  redis.go
  modules.go
  http.go
  compat.go

bootstrap.NewApp(cfg)
-> open postgres / redis
-> reconcile postgres schema via pgschema desired state
-> build platform services
-> build module infra adapters
-> build module application services
-> bind generated compat server implementations
-> register generated compat routes into Echo
-> return app runtime
```

这种装配方式直接服务于测试策略：

- domain test 不需要 bootstrap
- application integration test 只构造当前模块 + 真实数据库依赖
- transport contract test 可以挂真实 Echo + generated compat routes，但替换外部 provider
- job test 可以单独起 runner 和 handler，不需要整站启动

### 0.6.2 schema / init / readiness 顺序

本项目的正式启动顺序固定如下：

1. 读取根目录 `.env.local` 或部署环境变量
2. 建立真实 Postgres / Redis 连接
3. 调用 `pgschema` 让 live database schema 收口到仓库 desired state
4. 运行实例级初始化与 bootstrap guard
5. 构建 platform services、模块 infra、application 与 transport
6. 启动 HTTP runtime
7. 只有当 schema、初始化和依赖检查都完成后，`/readyz` 才返回 ready

规则：

- 不允许把 schema apply 延后到首次请求时再懒执行。
- 不允许在正常请求路径中隐式创建表、索引、触发器或 extension。
- 不允许让 `readyz` 在 schema 未收口、bootstrap 未检查完成时提前返回成功。
- `healthz` 可只表示进程存活；`readyz` 必须表达“真实依赖可用且 schema/init 已完成”。

### 0.6.1 transport 层的坏味道与禁止项

`transport` 层最容易因为“先把接口跑起来”而逐步吞掉 application / domain 责任。

本项目把以下情况视为明确坏味道，而不是可长期保留的工程折中：

- `transport/http/*` 持有业务内存状态、伪仓储、业务集合或业务状态机
- handler 直接在 transport 层维护 user / workspace / project / timer 等业务事实
- handler 在 transport 层拼接跨请求共享的可变业务状态，而不是调用 application service
- 为了“临时跑通”把授权、配额、领域规则或错误语义直接硬编码在路由壳层
- 已有 OpenAPI 合同后，仍持续手写 DTO、route table、bind/validate 入口并把它当成正式边界
- 在本地源码默认启动路径中，以内存 state、伪仓储或 placeholder runtime 代替真实 Postgres / Redis 依赖

允许存在的临时过渡实现只限于：

- 在 task packet 中明确标注为过渡态
- 明确写出退出条件、替换目标和所属波次
- 不把过渡态测试或占位 runtime 叙事当成正式完成依据

如果出现以下信号，必须优先做结构治理，而不是继续在其上叠加功能：

- handler 文件持续膨胀，并同时承载 decode、业务规则、状态管理和响应映射
- transport 测试主要在验证伪状态，而不是验证 OpenAPI / public contract / application 编排
- 新 endpoint 为了复用“现成状态”继续接入 transport 内 fake runtime，而不是接入对应模块

## 0.7 OpenAPI 生成与兼容工作流

OpenAPI 相关工作需要明确区分 4 件事：

1. 谁是兼容真相源
2. 生成哪些机械产物
3. 哪些逻辑必须手写
4. 如何证明实现没有偏离合同

固定流程如下：

1. 更新 `openapi/*.json`
2. 用 `oapi-codegen` 为 compat API 生成 DTO、参数类型、server interface、Echo 路由与 validator glue
3. 用 `kin-openapi` 生成或驱动 request/response contract skeleton
4. 人工维护 endpoint -> module -> use case 映射
5. 人工只实现 generated server interface 背后的 application adapter 与错误映射
6. 用 contract test + golden test 证明实现与 OpenAPI 一致

生成产物只允许落在以下边界：

- `transport/http/compat/*`
- `transport/http/web/*`
- `packages/shared-contracts/` 中面向前端或工具的 schema/type 产物
- `apps/backend/tests/compat/**` 与 `apps/backend/tests/golden/**` 的测试 skeleton

不允许把生成结果直接扩散到：

- `domain/`
- `application/commands`
- `application/queries`
- `infra/`
- `platform/`

兼容规则：

- `toggl-*` OpenAPI 更新后，必须先更新 compat contract test，再改实现
- compat route、bind、validation、handler interface 必须由生成链路提供，不允许回退为手写 endpoint 壳层
- compat handler 的 request validation 以 OpenAPI 为准，不允许在 handler 中额外发明另一套字段语义
- compat response 的字段名、可空性、错误 body 以 OpenAPI 与必要 golden 样本为准
- OpenToggl 自定义 API 也走同一生成链路，但合同来源换成 `opentoggl-*`

对于已经存在 OpenAPI 来源的正式边界，以下情况一律视为漂移：

- 继续新增手写 route table，而不是走生成 registration
- 继续新增手写 request/response DTO，导致与 OpenAPI 重复维护
- 在 handler 中补另一套独立字段校验或字段语义解释
- 以“目前只是 web/internal API”为理由长期跳过 generation-first 的边界收口

### 0.7.1 compat API 的生成边界

compat API 必须做到“架构由合同生成”，具体含义如下：

- endpoint path / method 生成
- path/query/header/body 参数类型生成
- request decode / bind 生成
- request validation 生成
- handler interface 生成
- route registration 生成
- contract test skeleton 生成

人工保留的部分只有：

- generated server interface 的实现
- transport public error mapping
- application command/query 调用
- endpoint 到模块/use case 的归属清单

不允许人工手写以下 compat 结构：

- compat route table
- compat request DTO
- compat response DTO
- compat handler method signature
- compat 参数校验入口

原因很简单：

- compat API 的首要目标是“跟着 OpenAPI 演进”，不是“让人写得顺手”
- 只要 endpoint 壳层允许手写，最终就一定会出现 shape drift、漏字段、漏校验和错误码偏移
- generation-first 比 code review 更可靠，因为它先消除了可变面

## 1. 目标目录

```text
apps/backend/
  main.go
  internal/
    bootstrap/
    http/
    web/
    <context>/
      domain/
      application/
      infra/
      transport/
        http/
          compat/
          web/
```

说明：

- `apps/backend` 是后端应用目录，`main.go` 是唯一进程入口。
- `apps/backend/internal/<context>` 是业务模块主体。
- 业务规则不放在 `main.go`；组合、装配与业务模块都收口在 `apps/backend/internal/*`。

## 2. 模块模板

每个业务模块统一采用下面的模板：

```text
apps/backend/internal/tracking/
  domain/
    time_entry.go
    timer_policy.go
    value_objects.go
    errors.go
  application/
    commands/
      start_time_entry.go
      stop_time_entry.go
    queries/
      list_time_entries.go
      get_running_timer.go
    ports.go
    permissions.go
  infra/
    pg/
      time_entry_repo.go
      time_entry_queries.go
    redis/
    providers/
  transport/
    http/
      compat/
        time_entries.go
        dto.go
      web/
        timer_page.go
        dto.go
```

规则：

- `domain` 放业务本体
- `application/commands` 放事务型用例
- `application/queries` 放列表、投影、聚合读取
- `infra` 放 port 的技术实现
- `transport/http/compat` 放 Toggl-compatible API
- `transport/http/web` 放 Web 管理接口

如果模块还很小，`commands/` 与 `queries/` 可以先不拆子目录，但语义上仍必须区分 command 与 query。

## 3. 每层放什么

### 3.1 `domain`

只放：

- entity
- value object
- invariant
- domain service
- domain error

不放：

- SQL
- HTTP DTO
- 鉴权上下文解析
- provider SDK
- 跨模块 orchestration

### 3.2 `application`

负责：

- command / query 用例
- 主事务边界
- 授权与 feature gate 检查
- 调用 repository / query port
- 同事务登记 audit 与 job record
- 返回给 transport 或 composition 层的结果

规则：

- command 负责写模型
- query 负责读模型或投影视图
- 不在 `application` 里直接拼 HTTP 响应
- 不在 `application` 里写复杂 SQL

### 3.3 `infra`

负责：

- Postgres repository / query service
- Redis adapter
- file store adapter
- 第三方 provider adapter
- projector / dispatcher 运行时实现

规则：

- `infra` 实现 `application` 定义的 port
- 一个模块的 `infra` 不得 import 另一个模块的 `infra`
- projector / delivery runtime 属于对应模块的 `infra`，不是 `platform` 的业务替身

### 3.4 `transport`

负责：

- handler
- request/response DTO
- auth context decode
- 参数校验映射
- public error mapping

规则：

- `compat` 与 `web` 可以共用同一 `application`
- `compat` 与 `web` 不共享 DTO 与错误映射
- transport 不是业务流程容器
- `compat` 的 DTO、参数要求和响应 shape 直接以 `openapi/*.json` 为准
- `web` transport 不应反向污染 compat DTO

### 3.5 OpenAPI 到模块的映射要求

每个 OpenAPI endpoint 都必须能回答：

- OpenAPI endpoint 是什么
- 属于哪个业务模块
- 对应哪个 command 或 query
- 由哪个 `transport/http/compat` 或 `transport/http/web` handler 承接
- 至少需要哪些 contract tests

推荐记录格式：

```text
POST /workspaces/{workspace_id}/time_entries
-> source: toggl-track-api-v9.swagger.json
-> module: tracking
-> use case: StartTimeEntry
-> transport: tracking/transport/http/compat
-> tests:
   - success contract
   - validation error
   - permission error
   - golden response
```

OpenToggl 自定义接口也同理，例如：

```text
POST /api/imports
-> source: opentoggl-import.openapi.json
-> module: importing
-> use case: StartImportJob
-> transport: importing/transport/http/web
-> tests:
   - success contract
   - validation error
   - permission error
   - job accepted response
```

这份映射可以生成，也可以维护成清单，但不能缺失。

## 4. Command / Query 规则

Command 的特征：

- 会修改事务真相源
- 需要事务
- 需要登记 audit 或 job record
- 返回写后结果或最小确认信息

Query 的特征：

- 不修改事务真相源
- 允许走 read model、projection、query port
- 返回列表、详情、聚合、导出预览所需视图

规则：

- 读写不要混在同一个 use case 中
- `reports` 默认是 query-first 模块，不直接当成其他模块的 repository 附属
- Web 页面的重型聚合读请求，也应以 query 形式存在，而不是偷写到 handler 中

## 5. 组合层与 Web Composition

跨模块聚合接口不属于任一业务模块 `domain`。

它们应放在：

- `apps/backend/internal/web/`：Web 页面所需的跨模块组合接口
- `apps/backend/internal/http/`：总路由、middleware、模块挂载
- `apps/backend/internal/bootstrap/`：依赖装配、provider wiring、config

典型场景：

- dashboard 同时读取 session、workspace、running timer、recent projects
- settings 页面组合 tenant、billing、governance 读模型
- admin 页面组合 instance status、quota、job health

规则：

- 组合层只做“把多个模块结果拼起来”
- 组合层不拥有独立领域规则
- 如果聚合逻辑本身形成稳定业务能力，应回收进某个业务模块的 `application/query`

## 5.5 `apps/backend` 的运行时边界

`apps/backend` 不是“随便写点 glue code”的目录，它有非常具体的职责：

- `main.go`：进程启动入口
- `internal/bootstrap/`：依赖装配、配置解析、生命周期管理
- `internal/http/`：顶层 middleware、路由注册、健康检查、公开 server 组装
- `internal/web/`：跨模块 Web composition query

明确不放：

- 领域规则
- 模块内部 repository
- 模块内部 SQL
- 只属于单个业务模块的 query 逻辑

判断规则：

- 如果逻辑只服务于 `tracking`，它应回到 `tracking/application`
- 如果逻辑稳定地组合 `tracking + tenant + membership` 的页面数据，它才属于 `apps/backend/internal/web`
- 如果逻辑只是数据库连接、server 启停、middleware 组合，它属于 `bootstrap` 或 `http`

### 5.5.1 本地开发运行时入口

后端本地开发入口固定为仓库根目录执行的 `air`。

规则：

- `air` 是唯一允许的后端本地源码开发启动入口，不再把 `go run ./apps/backend` 作为日常开发文档化入口。
- 根级 `.air.toml` 是后端热重载配置的唯一真相源；不允许在 `apps/backend`、根级 `scripts/` 或其他包装层复制第二套 dev runtime 配置。
- `.air.toml` 负责监听源码变化并重建/重启 `./apps/backend`，但不改变正式应用入口；真正的进程入口仍然是 `apps/backend/main.go`。
- 本地开发与默认运行时边界使用标准 env 名：`PORT`、`DATABASE_URL`、`REDIS_URL`。对数据库、Redis、监听端口这类通用运行时概念，不允许继续发明项目私有平行命名。
- `PORT` 只表达端口号；后端启动时统一监听 `0.0.0.0:<PORT>`，而不是把完整 listen address 暴露为默认 env 合同。
- `DATABASE_URL` 与 `REDIS_URL` 属于必填运行时输入；缺失时 `bootstrap` 必须直接失败，不允许回退到默认 DSN、内存实现或伪依赖。
- `air` 只服务本地源码开发；测试、CI、生产构建、self-hosted 容器运行时都不得依赖 `air` 常驻。
- 如果需要描述发布态、smoke test、容器化运行或调试正式二进制，应直接使用 Go 二进制、`docker compose` 或对应运行时命令，而不是复用 `air`。

## 6. 权限、套餐和事务

权限与套餐检查点在 `application`。

固定规则：

- 权限检查由发起动作的模块负责
- feature gating 的事实来源来自 `billing`
- API quota / rate limit 的事实来源来自 `governance`
- transport 只做错误映射，不做最终裁决

事务规则：

- 一个请求只有一个主事务边界
- 主事务由入口 command 持有
- 需要异步后续处理时，在同事务内写 `job record`
- 不允许在主事务里顺手刷新报表 projection 或直接发 webhook

## 7. 跨模块协作

允许的协作方式：

- `tenant/application` 调 `billing/application` 获取默认商业状态
- `tracking/application` 调 `membership/application` 查询权限
- `webhooks/application` 读取其他模块提交的 job payload
- `reports/application` 读取各模块投影或 query port

禁止：

- `tracking/infra` 直接查 `membership/infra`
- `billing/domain` import `tenant/domain`
- 在 repository 里跨模块 JOIN 并返回“顺便拼好的业务结果”

跨模块读取默认优先级：

1. 对方 `application` 暴露的 query 接口
2. 显式 query port
3. `reports` 或运营侧专用 read model

不要以“都在一个数据库里”为理由绕过边界。

## 8. Query Port 与 Repository

Repository 只做：

- 聚合根持久化
- 聚合生命周期查询
- 与事务写模型强相关的读取

Query Port 负责：

- 列表
- 搜索
- 聚合统计
- 页面读模型
- 跨模块投影视图

规则：

- 列表页、表格页、报表页默认优先用 query port
- repository 不要演变成万能 SQL 工具箱
- 一个 query 为页面服务并不意味着它必须放在 `transport`

## 8.2 如何为测试策略设计边界

本文件必须直接支撑 [testing-strategy](./testing-strategy.md)，而不是事后“再想怎么测”。

后端边界设计固定按下面约束执行：

- `domain` 保持纯内存可测，不引入数据库、HTTP、时间源全局单例
- `application` 用例显式接收 repository / query port / clock / job recorder / authz checker
- `infra` 负责真实数据库与外部系统接线，但其行为可通过真实集成边界测试，而不是 mock 内部调用顺序
- `transport` 保持薄层，使 contract test 只验证公开合同，不被业务拼装噪音污染
- `platform/jobs` 提供可同步推进的测试入口，避免 retry/backoff 测试真实等待

这意味着代码结构上必须预留以下可测接口：

- `Clock`
- `TxManager` 或等价事务执行抽象
- `JobRecorder`
- `AuthContextDecoder`
- 权限/feature gate query 接口
- 外部 provider client interface

但这些接口只在真实边界上出现，不允许为了“方便 mock”把内部逻辑拆成大量无意义接口。

测试映射关系应当非常直接：

- domain unit test -> `domain`
- application integration test -> `application + infra/pg + real tx`
- transport contract test -> `transport + real validator + real error mapping`
- async runtime test -> `platform/jobs + <module>/infra job handler`

如果一个实现很难按这四层快速测试，优先判断是边界设计错了，而不是补更多 mock。

## 8.5 允许自动生成的内容

为了减少 compat API 的机械劳动，允许生成以下产物：

- DTO types
- route / handler stub
- request validator skeleton
- endpoint-to-usecase mapping 清单
- contract test skeleton

不允许生成后直接当作最终实现的内容：

- domain entity
- application command / query 逻辑
- 权限与事务规则
- projector / webhook delivery / import runtime

## 9. Jobs、Projectors 与 Delivery Runtime

首版统一采用数据库 `job record`。

职责划分：

- `application/commands`：登记 job
- `platform/jobs`：提供 job runner、lease、retry、调度技术底座
- `<module>/infra`：实现具体 job handler
- `reports/infra`：实现 projector
- `webhooks/infra`：实现 delivery runtime
- `importing/infra`：实现 continuation / replay / recovery

规则：

- job payload 必须可重试、可审计、可幂等
- projector 属于 `reports`，不塞进 `tracking`
- webhook delivery 属于 `webhooks`，不塞进通用 `integrations`
- import 默认不回放历史 webhook，除非合同文档另有定义

## 10. `platform` 的边界

`platform` 只提供技术能力：

- `db`
- `auth`
- `filestore`
- `jobs`
- `clock`
- `idempotency`
- `httpx`
- `observability`

`platform` 不拥有：

- 注册邀请流程
- workspace 默认计划绑定
- 停用用户后的通知策略
- 任何跨模块业务编排

如果某个接口名字里带明显业务动作，它大概率不该在 `platform`。

`observability` 的最低要求：

- 后端进程启动成功时必须输出基础 startup log，至少包含监听地址、服务名与关键 runtime mode。
- HTTP 入口必须具备基础 request log；至少记录 method、path、status、duration 与 request id / trace correlation 字段中的可用子集。
- `/readyz` 与依赖初始化失败时必须输出可诊断日志，不能只返回静态状态而没有任何后台证据。
- “进程活着”与“依赖已就绪”必须能从日志与 readiness 结果中区分，不能只靠静态 `200 OK` 冒充可工作后端。
- 这些日志属于默认运行时要求，不是仅在 debug 模式下才存在的可选能力。

## 11. 后端测试入口

完整矩阵见 [testing-strategy](./testing-strategy.md)。

后端最低要求：

- `domain` 有单测覆盖不变量
- `application/commands` 有事务与权限级集成测试
- `transport/http/compat` 有合同测试
- `reports` / `webhooks` / `importing` 的异步运行时有 job 级测试
- compat endpoint 有 OpenAPI 到 handler / use case 的映射

进一步的结构要求：

- `application/*_integration_test.go` 默认通过真实 Postgres 跑用例，不 mock repository
- `transport/http/compat` 的 contract test 默认通过真实 `Echo` + generated compat routes + OpenAPI validator 跑请求
- handler 测试优先验证公开输入输出，不验证内部调用次数
- 需要时间推进的 job test 必须注入可控时钟
- 需要重试的 job test 必须在进程内同步推进调度，不做真实 sleep

## 12. Review 检查项

后端 review 至少检查：

- 事务边界是否只在 command use case 中存在
- query 是否错误地走了 repository 或在线扫 OLTP 大表
- 权限与 feature gating 是否落在 `application`
- 是否出现跨模块 `infra` 依赖
- job、projector、delivery runtime 是否落在正确模块
- `platform` 是否被滥用成“公共业务层”
