# OpenToggl 代码结构与依赖规则

本文档定义 `OpenToggl` 的目标代码结构，回答以下问题：

- 顶层模块怎么切
- 前后端目录怎么切
- 层与层之间怎么依赖
- 哪些东西必须同事务，哪些必须异步
- `platform` 到底是什么，不是什么
- `reports` 为什么要和事务写模型分开

这里不接受只写一句“采用 DDD-lite”就结束。必须把结构规则写到足以指导实现和 code review 的程度。

## 1. 总体目录

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

- `apps/web` 是前端应用。
- `apps/api` 是 Go API 进程入口。
- `packages/` 只放跨应用共享但不承载业务流程的代码。
- `backend/internal/` 才是后端业务模块主体。

不再采用 `organization/ workspace/ membership/ ...` 这种把业务边界和资源名混在一起的顶层切法。顶层目录按限界上下文划分，而不是按单个资源名划分。

## 2. 顶层模块职责

### 2.1 `identity`

负责：

- 用户账户
- 登录 / 登出 / session
- API token
- 密码与账户安全状态
- 当前用户信息与偏好

### 2.2 `tenant`

负责：

- `Organization`
- `Workspace`
- workspace / organization 设置
- organization / workspace 与 billing plan、subscription、quota profile 的关联关系
- 组织与工作区的归属关系
- workspace logo、avatar、品牌资源的业务归属

`tenant` 不负责成员关系细节，不负责项目目录，不负责 time entry。
`tenant` 只维护组织与工作区的归属、设置和对 billing 状态的引用，不拥有订阅、发票、customer 或 quota policy 的业务本体。

### 2.3 `membership`

负责：

- `OrganizationUser`
- `WorkspaceUser`
- `Group`
- `GroupMember`
- `ProjectUser`
- `ProjectGroup`
- 可见性、角色、成员费率、项目成员权限

`membership` 独立存在，不并入 `tenant` 或 `catalog`。

### 2.4 `catalog`

负责：

- `Client`
- `Project`
- `Task`
- `Tag`
- 项目状态、归档、默认策略、项目成员关联入口

`catalog` 不并入 `tenant`。虽然很多目录对象从属于 workspace，但它们本身有独立生命周期、权限规则和报表过滤语义。

### 2.5 `tracking`

负责：

- `TimeEntry`
- running timer
- `Expense`
- `Favorite`
- `Goal`
- `Reminder`
- expense attachments
- calendar integrations
- iCal
- 与时间追踪直接相关的事务写模型

### 2.6 `governance`

负责：

- `Approval`
- `Timesheet`
- `AuditLog`
- API quota / rate limit
- retention / policy
- meta / status / 治理相关接口
- 实例级注册策略
- 实例级配置入口
- 实例级健康状态与平台统计
- 站长 / 平台管理员入口

说明：

- self-hosted 站长能力与 SaaS 平台运营能力当前优先归入 `governance`
- 相关技术实现仍通过 `platform` 提供
- `platform` 负责 SMTP、存储、支付、SSO 等 provider 的技术实现，但不拥有这些实例级配置入口本身

### 2.7 `reports`

负责：

- Reports API v3
- saved / shared reports
- analytics read model
- report export orchestration

`reports` 是独立读模型模块，不是 `tracking` 的附属查询层。

### 2.8 `webhooks`

负责：

- Webhook subscription CRUD
- validate / ping / limits / status
- delivery / retry / failure governance

`webhooks` 保持顶层模块，不并入通用 `integrations`，因为它有独立公开合同和完整运行时语义。

### 2.9 `billing`

负责：

- 订阅
- 套餐
- 发票
- customer
- commercial quota policy / seat limits / feature exposure
- billing 公开接口与后台管理能力

`billing` 保持顶层模块，不并入 `tenant`。
`billing` 拥有 plan、subscription、invoice、customer、quota policy 与 feature exposure 的业务本体；`tenant` 只能引用这些状态，不得在本模块内复制订阅领域规则。

quota 语义必须拆开：

- `billing` 负责商业计划、seat 限制、功能门控与商业配额
- `governance` 负责 API quota / rate limit / quota headers
- 发票与支付状态仍归 `billing`

### 2.10 `importing`

负责：

- Toggl 导入
- 原始 ID 保留
- 冲突检测
- 部分成功回报
- 导入重试与审计

`importing` 保持顶层模块，不并入 `tracking` 或 `platform`。

### 2.11 `platform`

`platform` 只承载跨模块复用的技术底座，不承载业务规则，不拥有业务流程。

允许的典型子目录：

```text
backend/internal/platform/
  db/
  auth/
  filestore/
  jobs/
  httpx/
  clock/
  idempotency/
  observability/
```

`platform` 不是：

- 全局 service 层
- 公共业务编排层
- 任意跨模块规则的堆放区

## 3. 前端目录

前端固定采用 `React + Vite+`。

建议结构：

```text
apps/web/
  src/
    app/
    routes/
    pages/
    features/
    entities/
    shared/
      api/
      query/
      session/
      url-state/
      forms/
      ui/
      lib/
```

目录职责：

- `app/`：应用入口、providers、router、layout
- `routes/`：路由定义与 route-level loader / guard
- `pages/`：页面装配层
- `features/`：用户操作流，例如开始计时、停止计时、创建项目
- `entities/`：实体展示、entity model、DTO 到 view model 的映射
- `shared/api/`：HTTP client、请求封装、后端 DTO
- `shared/query/`：缓存、query key、数据获取 hook
- `shared/session/`：当前用户、登录态、鉴权上下文
- `shared/url-state/`：search params、filter state、分页与 URL 同步
- `shared/forms/`：表单 schema、adapter、提交格式转换
- `shared/ui/`：通用 UI 组件
- `shared/lib/`：纯工具函数

约束：

- 前端只依赖 API，不直接依赖数据库或后端内部模型。
- API DTO 和前端展示模型可以不同，不要求前端直接复用后端内部结构。
- `features/` 可以调用 `shared/api` 和 `shared/query`，但不应自己持有底层请求协议细节。
- DTO 到 view model 的映射优先放在 `entities/*`，不要散落在页面和组件里。

## 4. 后端模块内部结构

后端固定采用 `Go`，首版按模块化单体组织，不单独部署 worker。

建议结构：

```text
backend/internal/
  tracking/
    domain/
      time_entry.go
      timer_policy.go
      errors.go
    application/
      start_time_entry.go
      stop_time_entry.go
      list_time_entries.go
      ports.go
    infra/
      time_entry_repo_pg.go
      query_repo_pg.go
    transport/
      http/
        compat/
          start_time_entry.go
          stop_time_entry.go
          dto.go
        web/
          start_time_entry.go
          dto.go
```

同样模式适用于 `tenant`、`membership`、`catalog`、`reports`、`webhooks`、`billing` 等模块。

## 5. 每层放什么

### 5.1 `domain`

只放业务本质规则：

- entity
- value object
- invariant
- domain error

例如：

- `TimeEntry` 不能在已停止后再次停止
- 同一 workspace 下是否允许并发 running timer
- `Project` 归档后是否还允许关联新的时间记录

不放：

- HTTP request parsing
- SQL
- JSON DTO
- Postgres / Redis client
- 外部 provider SDK

### 5.2 `application`

负责用例编排：

- 入口 use case
- 主事务边界
- 权限检查
- 调 repository / query port
- 调 domain rule
- 同事务登记后台 job
- 返回给 transport 的结果

约束：

- 一个用例一个文件或一小组文件
- 不在 `application` 层写复杂领域规则
- 不在这里直接拼 HTTP 响应
- 跨模块同步调用只允许依赖对方 `application` 暴露的接口，不允许直连对方 `infra`

### 5.3 `infra`

负责技术实现：

- Postgres repository
- query repository
- Redis cache
- 外部 provider
- file store adapter

原则：

- `infra` 实现 `application` 定义的 port
- `application` 只依赖接口，不依赖具体实现
- 不允许一个模块的 `infra` 直接 import 另一个模块的 `infra`

### 5.5 `platform` 接口层级示例

`platform` 只提供业务模块可复用的技术接口，不直接承载高层业务语义。

允许的技术接口示例：

- `Mailer.Send(ctx, to, subject, htmlBody)`
- `BlobStore.Put(ctx, key, contentType, body)`
- `PaymentProvider.CreateSetupIntent(ctx, customerRef)`
- `SSOProvider.BuildAuthorizeURL(ctx, state)`

不应放进 `platform` 的接口示例：

- `SendRegistrationInviteEmail`
- `CreateWorkspaceWithDefaultPlan`
- `DisableUserAndNotifyOrgOwners`

这些高层动作属于业务模块用例，由业务模块组合 `platform` 接口完成。

### 5.4 `transport`

负责协议层：

- HTTP handlers
- request / response DTO
- 鉴权上下文提取
- 公开错误映射
- Web 管理接口响应映射

规则：

- `transport/http/compat` 承载 Toggl-compatible API
- `transport/http/web` 承载 OpenToggl Web UI 自己使用的后台接口
- `compat` 与 `web` 可以共享同一个 `application`
- `compat` 与 `web` 不共享 DTO 和错误映射
- 跨模块 web 聚合接口放在 `apps/api` 入口层或显式的 web composition 层，不归属任一业务模块的 `domain`
- 不在 handler 里写业务流程

## 6. 依赖方向

唯一允许的主方向：

```text
transport -> application -> domain
infra ----> application / domain
all modules -> platform
```

明确禁止：

- `platform -> any business module`
- `domain -> transport`
- `domain -> Postgres client`
- `application -> concrete HTTP request/response type`
- `module A/infra -> module B/infra`

允许：

- `transport` 依赖本模块 `application`
- `infra` 依赖本模块 `domain` 和 `application` 中定义的接口
- 一个模块的 `application` 通过接口依赖另一个模块的 `application`

## 7. 跨模块协作与事务规则

### 7.1 单请求事务规则

- 一个 HTTP 请求只有一个主事务边界。
- 主事务由入口 use case 持有，不由 repository 各自隐式开启。
- 成功响应所依赖的真相源状态，必须在这个事务内落库完成。

### 7.2 必须同事务完成的内容

- 主业务数据写入
- 权限判断所需的最小状态变更
- 审计记录
- 后续异步处理所需的 `job record`

### 7.3 必须异步处理的内容

- reports projection 刷新
- webhook dispatch
- 导出文件生成
- 通知
- 清理任务
- 可延后的缓存失效

### 7.4 禁止的做法

- 为了“顺手”在主事务里更新报表读模型
- 在请求链路里直接调用第三方副作用并把它当作成功前置条件
- 一个模块直接调用另一个模块的 `infra`

### 7.5 `tenant` / `billing` 关联机制

- `tenant` 负责持有 `organization` / `workspace` 与 plan、subscription、quota profile 的关联引用
- `billing` 负责 plan、subscription、invoice、customer、commercial quota policy 的业务本体与状态机
- `tenant` 可以持有诸如 `organization.subscription_id`、`workspace.subscription_view_key` 这类关联字段
- 关联字段的存在不代表 `tenant` 拥有 subscription 领域规则

创建协调规则：

- 创建 `organization` / `workspace` 的主入口在 `tenant/application`
- `tenant/application` 可以通过 `billing/application` 接口解析默认 plan、创建默认商业状态或绑定 quota profile
- `billing` 不直接依赖 `tenant` 实体，而是接收显式输入参数，例如 organization ID、workspace ID、plan key
- 若某个部署模型下不存在真实 subscription 创建动作，`billing/application` 仍需要返回同样的默认商业状态

边界规则：

- “当前租户挂在哪个 subscription / plan / quota profile 上”属于 `tenant`
- “某个 subscription 是否有效、某个 plan 提供哪些 feature、某个商业限制是否生效”属于 `billing`

### 7.6 Feature Gating 检查点

feature gating 的事实来源来自 `billing`，但检查点落在发起该业务动作的模块 `application` 层。

规则：

- `billing` 提供 plan / feature / commercial quota 的判定接口或 query port
- 具体业务模块在自己的 `application` 用例中调用这些接口
- `transport` 不直接承载 feature gating 规则，只负责错误映射
- Web UI 可以预先隐藏入口，但 UI 不是 gating 的最终裁决点

检查点：

- 变更型请求
  - 在进入主写事务前检查是否允许执行
- gated 读请求
  - 在执行重型报表、导出、聚合查询前检查是否允许执行
- 异步任务创建
  - 在登记导出、重建、补算等 job 前检查当前请求是否具备能力

错误语义：

- 因套餐或商业限制不可用
  - 返回公开的 `402 Payment Required`
- 因 API quota / rate limit 超限
  - 返回公开的 `429`
- 因权限或可见性不足
  - 返回公开的 `403`
- 因领域不变量或参数非法失败
  - 不应伪装成 `402`

例子：

- free plan 创建第 11 个受限 project
  - `402`
- 免费套餐触发受限的 reports export
  - `402`
- API 请求窗口额度耗尽
  - `429`
- 用户对 private project 无权限
  - `403`

## 8. Repository / Query / Value Object 规则

### 8.1 Repository

- Repository 是聚合根的持久化抽象
- Repository 默认返回聚合根或聚合根集合
- Repository 不承载报表聚合、跨模块统计、导出视图这类读模型查询
- Repository 方法应围绕聚合生命周期命名，而不是围绕任意 SQL 结果命名

### 8.2 Query Port / Query Service

- 面向列表页、搜索、聚合统计、跨聚合读取的能力，使用 query port 或 query service
- query port 可以返回 DTO、投影视图或部分字段结果
- `reports` 查询默认不走事务型 Repository，而走 read model / query port
- 跨模块读取优先使用显式 query port，不通过跨模块 JOIN 暗中耦合

### 8.3 跨模块 JOIN 规则

- 不允许在一个业务模块的事务型 Repository 里直接拼另一个业务模块的内部表来返回业务结果
- 允许在以下场景使用显式的读模型 JOIN：
  - `reports` 自己的 projection / read model
  - 明确声明的 query port
  - 平台诊断和运营查询视图

### 8.4 Value Object

- Value Object 适用于需要显式表达业务含义、统一验证规则或统一比较规则的概念
- 如果一个字段只有原始存取意义，没有独立业务语义，可以先保持基础类型
- 如果一个概念需要统一验证、统一比较或统一格式化，应优先提升为 Value Object

当前优先考虑建模为 Value Object 的概念：

- 时间范围
- 金额与币种
- 报表过滤条件
- 计费周期
- email
- duration

## 9. 后台任务最低规则

首版统一采用 `job record`，不引入通用 `event record` 机制。

这意味着：

- 用例成功提交事务后，若需要异步后续处理，就在同事务内登记 `job record`
- 后台 runner 只消费持久化 job
- 不引入进程内事件总线
- 不要求建立通用业务事件框架

典型 job：

- `project_report_projection`
- `dispatch_webhook_delivery`
- `generate_report_export`
- `continue_import_batch`

`job record` 是架构规则，不是某个模块里的临时实现细节。

`importing` 的默认联动规则：

- import 完成后触发 reports projection 重建或补投影
- import 默认不回放历史 webhook 事件
- import 应写入 audit log
- import 完成后应重新评估当前实例下的 billing / quota 状态

## 10. Reports 的读写模型边界

项目仍然采用 `PostgreSQL` 作为主数据库，但需要明确区分：

- OLTP 写模型
- reports 读模型

这里的区分是逻辑职责区分，不要求使用不同数据库。

推荐原则：

- `tracking`、`catalog`、`membership` 等模块维护事务真相源表
- `reports` 维护自己的 projection / read-model 表
- 报表查询优先读取 `reports` 侧读模型，而不是直接临时扫 OLTP 大表
- projection 刷新通过 `job record` 触发

因此：

- “仍然都在 PostgreSQL 里”是允许的
- “reports 直接长期依赖 OLTP 大表在线聚合”是不允许的

## 11. 具体例子：开始一个 time entry

这是“按领域拆模块 + job 异步 + compat/web transport 分层”在本项目里的落地例子。

### 10.1 `domain` 示例

```go
package domain

import "errors"

var (
	ErrTimerAlreadyStopped = errors.New("timer already stopped")
	ErrRunningTimerExists  = errors.New("running timer already exists")
)

type TimeEntry struct {
	ID          int64
	WorkspaceID int64
	UserID      int64
	Description string
	StartAt     int64
	StopAt      *int64
}

func (t *TimeEntry) Stop(stopAt int64) error {
	if t.StopAt != nil {
		return ErrTimerAlreadyStopped
	}
	t.StopAt = &stopAt
	return nil
}
```

### 10.2 `application` 示例

```go
package application

import (
	"context"
	"opentoggl/backend/internal/tracking/domain"
)

type StartTimeEntryInput struct {
	WorkspaceID int64
	UserID      int64
	Description string
	StartAt     int64
}

type TimeEntryRepository interface {
	Insert(ctx context.Context, entry *domain.TimeEntry) error
	HasRunningEntry(ctx context.Context, workspaceID, userID int64) (bool, error)
}

type JobRepository interface {
	Enqueue(ctx context.Context, kind string, payload []byte) error
}

type TxManager interface {
	WithinTransaction(ctx context.Context, fn func(context.Context) error) error
}

type StartTimeEntry struct {
	tx      TxManager
	repo    TimeEntryRepository
	jobRepo JobRepository
}

func (uc StartTimeEntry) Execute(ctx context.Context, in StartTimeEntryInput) (*domain.TimeEntry, error) {
	var entry *domain.TimeEntry

	err := uc.tx.WithinTransaction(ctx, func(txCtx context.Context) error {
		hasRunning, err := uc.repo.HasRunningEntry(txCtx, in.WorkspaceID, in.UserID)
		if err != nil {
			return err
		}
		if hasRunning {
			return domain.ErrRunningTimerExists
		}

		entry = &domain.TimeEntry{
			WorkspaceID: in.WorkspaceID,
			UserID:      in.UserID,
			Description: in.Description,
			StartAt:     in.StartAt,
		}

		if err := uc.repo.Insert(txCtx, entry); err != nil {
			return err
		}
		if err := uc.jobRepo.Enqueue(txCtx, "project_report_projection", []byte("{}")); err != nil {
			return err
		}
		if err := uc.jobRepo.Enqueue(txCtx, "dispatch_webhook_delivery", []byte("{}")); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return entry, nil
}
```

这里表达的是：

- 入口 use case 持有主事务
- 同事务写业务数据
- 同事务登记异步 job
- 不在这里关心 HTTP 细节

### 10.3 `transport/http/compat` 示例

```go
package compat

import (
	"net/http"
	"opentoggl/backend/internal/tracking/application"
)

type StartTimeEntryHandler struct {
	usecase application.StartTimeEntry
}

func (h StartTimeEntryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	in := decodeStartRequest(r)

	entry, err := h.usecase.Execute(r.Context(), application.StartTimeEntryInput{
		WorkspaceID: in.WorkspaceID,
		UserID:      currentUserID(r),
		Description: in.Description,
		StartAt:     in.StartAt,
	})
	if err != nil {
		writeCompatibleError(w, err)
		return
	}

	writeJSON(w, mapTimeEntryResponse(entry))
}
```

`compat` handler 的职责是：

- 解公开请求
- 调用 use case
- 返回按 Toggl 公开定义组织的响应

### 10.4 `transport/http/web` 示例

`web` handler 也可以调用同一个 use case，但它的 DTO、错误映射和鉴权入口属于 OpenToggl 自己的 Web 管理接口，不应复用 compat DTO。

## 12. Postgres Blob 文件存储边界

文件存储也要走明确边界，不能在业务模块里随手操作 blob。

建议结构：

```text
backend/internal/platform/filestore/
  filestore.go
  postgres_blob_store.go
```

接口示例：

```go
package filestore

import "context"

type Store interface {
	Put(ctx context.Context, key string, contentType string, body []byte) error
	Get(ctx context.Context, key string) ([]byte, string, error)
	Delete(ctx context.Context, key string) error
}
```

使用方式：

- `tracking` 只说“保存 expense attachment”
- `reports` 只说“保存导出文件”
- `tenant` 只说“保存 workspace logo / avatar”
- 是否落在 Postgres blob 表，由 `platform/filestore` 实现负责

业务归属规则：

- `reports` 拥有报表相关的 CSV / PDF / XLSX 导出任务与导出文件接口
- `tracking` 拥有附件、calendar integrations、iCal 相关业务流程
- `tenant` 拥有 avatars / logos 的业务归属
- `governance` 拥有 dashboard、status、meta
- `platform` 只提供底层文件存储、HTTP client、jobs 等技术能力，不拥有这些产品能力

这里的归属规则以最终代码模块边界为准，不再沿用 `toggl-domain-model.md` 中 `Integrations` 作为单一代码模块。

## 13. 哪些地方不用硬上复杂领域模型

这些地方可以更务实：

- reports filter parsing
- webhook delivery retry scheduler
- 导出文件生成
- 简单配置读取
- 健康检查和 meta/status 端点

这些地方仍然遵守模块边界，但不必为了术语而造复杂对象。

## 14. 必须避免的退化

- 按技术层建一个全局 `controllers/ services/ repositories/ models/`
- `platform` 演变成全局业务编排层
- HTTP DTO 和数据库模型共用一个 struct
- handler 直接写 SQL
- domain import 基础设施库
- 一个模块直接 import 另一个模块的 `infra`
- reports 直接临时扫 OLTP 大表，不留 projection 边界
- 文件上传逻辑散落在各模块里，不经统一 `filestore`
- `features/` 自己拼底层 HTTP 请求和缓存协议
- Repository 退化成通用 SQL 工具箱
- 用事务型 Repository 承载报表和聚合查询

## 15. 实现优先级建议

本节只定义实现顺序建议，不代表首版范围裁剪。首版正式版本的范围仍以 `docs/core/product-definition.md` 及 `docs/product/` 下已定义的完整产品能力为准。

优先建立：

1. `identity`
2. `tenant`
3. `membership`
4. `catalog`
5. `tracking`
6. `platform/db`
7. `platform/auth`
8. `platform/filestore`
9. `platform/jobs`
10. `platform/observability`

以下顺序用于降低实现风险，不表示 `reports`、`webhooks`、`importing`、`billing` 被排除在首版正式版本之外。

第二阶段再补：

1. `governance`
2. `reports`
3. `webhooks`
4. `importing`
5. `billing`

这样可以先把主事务链路做扎实，再扩展治理、读模型和后台任务能力。
即使 `governance` 较后实现，首版正式版本仍不得缺失其公开能力。
