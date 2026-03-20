# OpenToggl DDD / 架构术语表

本文档定义 `OpenToggl` 的领域术语、架构术语与对象层级关系。

这些定义先于代码结构存在；代码模块划分必须服从本文档，而不能反向决定领域边界。

如果其他文档与本文档冲突，以本文档为准；具体产品行为、接口语义和页面语义，再分别以对应产品文档、OpenAPI 和 Figma 补充。

## 1. 总则

### 产品资源挂载点

定义：

- 某个公开对象、能力或接口在产品/API 表面上挂载到哪个资源名之下。

说明：

- 产品资源挂载点描述的是公开表面，不描述代码归属，也不直接定义领域所有权。

OpenToggl 映射：

- 组织级 subscription 相关公开端点可能挂载在 `organization`
- 工作区级 subscription 视图相关公开端点可能挂载在 `workspace`

### 代码模块边界

定义：

- 某项业务规则、状态机或用例在代码中归哪个模块拥有。

说明：

- 代码模块边界是实现决策，必须服从限界上下文、聚合边界和领域规则定义。
- 产品资源名、领域实体名与代码模块名可以不同，不要求一一对应。

OpenToggl 映射：

- `organization` / `workspace` 是产品资源与领域对象，不是顶层代码模块
- 代码层面它们归 `tenant`
- `billing` 拥有 plan / subscription / invoice / customer 本体

## 2. DDD 术语

### 限界上下文

定义：

- 限界上下文是一组共享同一术语、一致业务规则和清晰协作边界的领域边界。
- 限界上下文定义的是业务语言和规则边界，不是目录名，也不是 HTTP 资源名。

OpenToggl 映射：

- OpenToggl 以限界上下文作为顶层业务划分依据。
- 当前已确认的限界上下文包括：
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
  - `platform`

### 聚合

定义：

- 聚合是一组需要在同一一致性边界内维护状态的领域对象集合。
- 聚合定义哪些状态必须在一次业务变更中共同保持有效，而不是定义“哪些对象经常一起出现”。

### 聚合根

定义：

- 聚合根是聚合的一致性边界入口。
- 外部对象通过聚合根访问该聚合，并由聚合根维护聚合内部关键不变量。

OpenToggl 映射：

- 当前已确认的核心聚合根：
  - `Workspace`
  - `Project`
  - `TimeEntry`
  - `WebhookSubscription`
  - `SavedReport`
  - `RegistrationPolicy`
  - `InstanceSetting`
- 其他实体是否为独立聚合根，必须以其是否承载独立一致性边界为准，不能仅因为“它很重要”就默认算聚合根。

### 实体

定义：

- 实体是具有稳定身份、可跨时间延续并承载业务生命周期语义的领域对象。
- 实体的相等性首先由身份判断，而不是由全部字段值判断。

OpenToggl 映射：

- `User`
- `Organization`
- `Workspace`
- `Project`
- `TimeEntry`
- `WebhookDelivery`
- `InstanceAdmin`
- `RegistrationPolicy`
- `InstanceSetting`
- `MaintenanceMode`

### 值对象

定义：

- 值对象是通过值而不是身份来判断相等的领域对象。
- 值对象应当不可变，并在创建时完成必要校验。

OpenToggl 映射：

- 时间范围
- 金额与币种
- 报表过滤条件

### 值对象示例 shape

定义：

- 值对象的概念性示例，用于统一创建、验证、比较和组合方式。

OpenToggl 示例：

- `Email`
- `Duration`
- `Money`
- `TimeRange`
- `BillingPeriod`
- `ReportFilter`

### 领域规则

定义：

- 用于维持业务不变量的规则。
- 领域规则可以由聚合根、实体、值对象或领域服务承载，但不能退化为仅由协议层或基础设施层隐式保证。

## 3. 分层与实现术语

### 代码模块

定义：

- 代码模块是当前代码结构中的顶层实现单元，用于承载某个限界上下文或其组成部分。
- 代码模块服务于实现，不定义领域真相；领域真相由限界上下文、聚合、实体和值对象定义。

OpenToggl 映射：

- `tenant` 是代码模块
- `Organization` 不是代码模块
- `Workspace` 不是代码模块

### 应用层

定义：

- 应用层是用例编排层。
- 应用层负责事务边界、授权裁决、调用顺序和跨聚合协作，但不拥有领域真相。

OpenToggl 映射：

- 负责事务边界、权限检查、端口调用和后台 job 登记

### Application Service

定义：

- Application Service 是应用层中的用例服务，负责事务边界、权限裁决、聚合调用、端口调用和跨模块编排。

OpenToggl 映射：

- 位于各模块的 `application/` 目录

### Domain Service

定义：

- Domain Service 是不自然归属于单一聚合根、但仍属于领域规则的服务。

OpenToggl 映射：

- 用于承载跨聚合但仍属于领域语义的规则

### 协议层

定义：

- 协议层是与 HTTP 或其他协议直接交互的层。
- 协议层负责协议适配、输入输出转换和公开 DTO，不负责定义领域规则。

OpenToggl 映射：

- `transport/http/compat`
- `transport/http/web`

### 基础设施层

定义：

- 基础设施层是技术实现层。
- 基础设施层负责存储、缓存、外部通信和运行时支撑，不定义业务边界。

OpenToggl 映射：

- 数据库
- 缓存
- 文件存储
- 外部 provider
- 后台 runner

### Port

定义：

- Port 是应用层或领域层定义的接口，由基础设施层或其他受控模块边界提供实现。
- Port 的作用是隔离领域/应用规则与具体技术实现，而不是绕过模块边界。

OpenToggl 映射：

- repository interface
- query interface
- mail / storage / payment / provider interface

### Adapter

定义：

- Adapter 是对某个 port 或外部系统协议的具体实现。

OpenToggl 映射：

- Postgres repository
- SMTP sender
- Blob storage client
- Payment provider client

## 4. 对象层级与依赖关系

### 模块 / 聚合 / 实体 / 值对象

定义：

- 限界上下文定义业务语言边界。
- 代码模块承载限界上下文的实现。
- 聚合定义模块内部的领域一致性边界。
- 实体和值对象是聚合内部的主要建模单元。

依赖关系：

- 代码模块依赖限界上下文定义来组织实现。
- 聚合依赖限界上下文定义来决定一致性范围。
- 实体和值对象依赖聚合与领域规则来确定各自职责。
- 应用层编排聚合，但不反向定义聚合。
- 协议层和基础设施层服务于应用层与领域层，但不反向定义实体、值对象或聚合。

OpenToggl 映射：

- 模块回答“这类业务归谁实现”
- 聚合回答“哪些对象必须一起维护一致性”
- 实体回答“哪些对象有独立身份并承载生命周期”
- 值对象回答“哪些概念以值和不可变约束表达”

## 5. Quota 术语

### 商业配额

定义：

- 与套餐、seat 限制、feature gating 绑定的限制。

OpenToggl 映射：

- 归 `billing`
- 定义套餐、seat、feature gating、对象数量上限等商业限制的策略本体

### 治理配额

定义：

- 与 API 使用、审计、保留策略、实例状态或治理策略绑定的限制。

OpenToggl 映射：

- 归 `governance`
- 定义 API quota、retention、audit 相关约束和运行时治理限制

### API Quota

定义：

- 与 API 请求窗口、剩余额度、重置时间相关的配额表达。

OpenToggl 映射：

- `GET /me/quota`
- `X-Toggl-Quota-Remaining`
- `X-Toggl-Quota-Resets-In`
- 归 `governance`
- 其窗口或阈值可以受 plan 策略影响，但公开 API quota 的表达与执行归 `governance`

### Rate Limit

定义：

- 技术层请求速率限制。

OpenToggl 映射：

- 归 `governance`
- 可按 plan 或部署策略调整阈值，但限流执行本身归 `governance`

## 6. Read Model 术语

### OLTP 写模型

定义：

- 事务真相源。

### Analytics Read Model

定义：

- 面向报表和分析的读模型。

OpenToggl 映射：

- 与 `reports projection` 同义

### Reports Projection

定义：

- 从事务写模型派生出的报表读模型表或聚合结果。

OpenToggl 映射：

- 归 `reports`

## 7. 异步术语

### Job Record

定义：

- 一条已经持久化的、待后台执行的具体任务。

OpenToggl 映射：

- 同事务登记
- 后台 runner 消费

### Domain Event

定义：

- 领域内部对“发生了什么”的语义表达。

### Event Record

定义：

- 持久化的业务事件记录。

### Outbox

定义：

- 把主事务写入与异步投递解耦的一种技术模式。

OpenToggl 映射：

- 当前架构基线不把 outbox 作为首版必需机制
- 首版异步协调机制以 `job record` 为准

### Saga / Process Manager

定义：

- 用于跨多个步骤或跨多个模块协调长事务、重试与补偿的流程协调模式。

OpenToggl 映射：

- 当前不是首版默认术语或默认实现
- 只有在简单 job 编排不足以表达跨步骤恢复时才需要显式引入

### Anti-Corruption Layer

定义：

- 为了防止外部模型或其他上下文的术语直接污染当前上下文而设置的隔离层。

OpenToggl 映射：

- 当前默认目标是“防腐效果”
- 不要求每个边界都显式建一个独立 ACL 模块

## 8. Operational Integrations

定义：

- 领域概念上的聚类，用来指代面向外部系统或文件交付的能力。

OpenToggl 映射：

- calendar sync
- webhook delivery
- export jobs
- file attachments

说明：

- `Operational Integrations` 不是代码顶层模块

## 9. 实例级术语

### 实例级能力

定义：

- 围绕整个 OpenToggl 实例，而不是某个 organization / workspace / project / user 的能力。

OpenToggl 映射：

- 首个管理员 bootstrap
- 注册开关
- 实例级 SMTP / 存储 / 支付配置
- 实例健康状态
- 平台级统计与诊断

### 平台管理能力

定义：

- 由实例管理员、站长或 SaaS 平台运营者执行的高权限管理能力。

OpenToggl 映射：

- 当前优先归 `governance`

## 10. 实体映射

### 业务实体 -> 模块

定义：

- 当前文档体系中的实体归属表。

OpenToggl 映射：

- `User` -> `identity`
- `Organization` -> `tenant`
- `Workspace` -> `tenant`
- `OrganizationUser` -> `membership`
- `WorkspaceUser` -> `membership`
- `Group` -> `membership`
- `GroupMember` -> `membership`
- `ProjectUser` -> `membership`
- `ProjectGroup` -> `membership`
- `Client` -> `catalog`
- `Project` -> `catalog`
- `Task` -> `catalog`
- `Tag` -> `catalog`
- `TimeEntry` -> `tracking`
- `Expense` -> `tracking`
- `Favorite` -> `tracking`
- `Goal` -> `tracking`
- `Reminder` -> `tracking`
- `Approval` -> `governance`
- `Timesheet` -> `governance`
- `AuditLog` -> `governance`
- `WebhookSubscription` -> `webhooks`
- `WebhookDelivery` -> `webhooks`
- `Plan` -> `billing`
- `Subscription` -> `billing`
- `Invoice` -> `billing`
- `Customer` -> `billing`
- `ImportJob` -> `importing`
- `SavedReport` -> `reports`
- `DetailedReport` -> `reports`
- `SummaryReport` -> `reports`
- `WeeklyReport` -> `reports`
- `Insight` -> `reports`
- `CalendarIntegration` -> `tracking`
- `Calendar` -> `tracking`
- `CalendarEvent` -> `tracking`
- `InstanceAdmin` -> `governance`
- `RegistrationPolicy` -> `governance`
- `InstanceSetting` -> `governance`
- `MaintenanceMode` -> `governance`
- `PlatformStat` -> `governance`

说明：

- 该映射表记录当前架构基线，不记录开放争议。
- 若某个实体归属在挑战文档中仍被讨论，以主架构文档当前定稿为准；挑战文档只记录待辩点，不覆盖词条定义。

## 11. Query 术语

### Repository

定义：

- 聚合根的持久化抽象。

OpenToggl 映射：

- 默认返回聚合根
- 不承载报表、聚合统计或导出视图查询

### Query Port / Query Service

定义：

- 面向列表、搜索、聚合统计、读模型查询的读取接口。

OpenToggl 映射：

- 可以返回 DTO、投影视图或部分字段
- `reports` 查询默认通过 query port / read model 完成

## 12. 统一用词

本文档中的统一用词：

- `兼容合同`
- `OLTP 写模型`
- `Analytics Read Model`
- `reports projection`
- `job record`
- `Operational Integrations`
