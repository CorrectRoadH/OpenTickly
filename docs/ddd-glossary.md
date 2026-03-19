# OpenToggl DDD / 架构术语表

本文档用于定义 `OpenToggl` 在架构、DDD 和模块划分上的关键术语。

如果术语表与其他文档冲突，以本文档和 `docs/codebase-structure.md` 的组合解释为准。

## 1. 总则

### 产品资源挂载点

定义：

- 某个公开对象或接口在产品/API 表面上挂载到哪个资源名之下。

OpenToggl 映射：

- 组织级 subscription 挂载在 `organization`
- 工作区级 subscription 视图挂载在 `workspace`

### 代码模块边界

定义：

- 某项业务规则、状态机或用例在代码中归哪个模块拥有。

OpenToggl 映射：

- `organization` / `workspace` 是产品资源与实体，不是顶层代码模块
- 代码层面它们归 `tenant`
- `billing` 拥有 plan / subscription / invoice / customer 本体

## 2. DDD 术语

### 限界上下文

定义：

- 一组高内聚的业务概念、规则和用例边界。

OpenToggl 映射：

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

### 模块

定义：

- 当前代码结构中的顶层实现单元。

OpenToggl 映射：

- `tenant` 是模块
- `Organization` 不是模块
- `Workspace` 不是模块

### 聚合

定义：

- 一组需要在同一一致性边界内维护状态的对象集合。

### 聚合根

定义：

- 一个聚合的一致性边界入口。

OpenToggl 映射：

- `Workspace`
- `Project`
- `TimeEntry`
- `WebhookSubscription`
- `SavedReport`
- `RegistrationPolicy`
- `InstanceSetting`

### 实体

定义：

- 具有稳定身份标识的领域对象。

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

- 通过值而不是身份来判断相等的对象。

OpenToggl 映射：

- 时间范围
- 金额与币种
- 报表过滤条件

### 值对象示例 shape

定义：

- 值对象的最小结构示例，用于统一创建、验证和比较方式。

OpenToggl 示例：

```go
type Email struct {
	value string
}

func NewEmail(raw string) (Email, error)
func (e Email) String() string
```

```go
type Duration struct {
	seconds int64
}

func NewDuration(seconds int64) (Duration, error)
func (d Duration) Seconds() int64
```

```go
type Money struct {
	amountCents int64
	currency    string
}

func NewMoney(amountCents int64, currency string) (Money, error)
func (m Money) AmountCents() int64
func (m Money) Currency() string
```

```go
type TimeRange struct {
	start time.Time
	end   time.Time
}

func NewTimeRange(start, end time.Time) (TimeRange, error)
func (r TimeRange) Start() time.Time
func (r TimeRange) End() time.Time
```

```go
type BillingPeriod struct {
	kind  string
	start time.Time
	end   time.Time
}

func NewBillingPeriod(kind string, start, end time.Time) (BillingPeriod, error)
```

```go
type ReportFilter struct {
	workspaceID int64
	start       time.Time
	end         time.Time
	grouping    string
}

func NewReportFilter(...) (ReportFilter, error)
```

### 领域规则

定义：

- 用于维持业务不变量的规则。

## 3. 分层术语

### 应用层

定义：

- 用例编排层。

OpenToggl 映射：

- 负责事务边界、权限检查、端口调用和后台 job 登记

### 协议层

定义：

- 与 HTTP 或其他协议直接交互的层。

OpenToggl 映射：

- `transport/http/compat`
- `transport/http/web`

### 基础设施层

定义：

- 技术实现层。

OpenToggl 映射：

- 数据库
- 缓存
- 文件存储
- 外部 provider
- 后台 runner

## 4. 对象层级

### 模块 / 聚合 / 实体

定义：

- 模块是最大的实现边界
- 聚合是模块内部的一致性边界
- 实体和值对象是聚合内部的建模单元

OpenToggl 映射：

- 模块回答“这类业务归谁实现”
- 聚合回答“哪些对象必须一起维护一致性”
- 实体回答“哪些对象有独立身份”

## 5. Quota 术语

### 商业配额

定义：

- 与套餐、seat 限制、feature gating 绑定的限制。

OpenToggl 映射：

- 归 `billing`

### API Quota

定义：

- 与 API 请求窗口、剩余额度、重置时间相关的配额表达。

OpenToggl 映射：

- `GET /me/quota`
- `X-Toggl-Quota-Remaining`
- `X-Toggl-Quota-Resets-In`
- 归 `governance`

### Rate Limit

定义：

- 技术层请求速率限制。

OpenToggl 映射：

- 归 `governance`

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
