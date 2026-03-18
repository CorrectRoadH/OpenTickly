# OpenToggl PRD

## Problem Statement

用户需要一个真正可替代 Toggl 的开源产品 `OpenToggl`。这个产品的目标不是“类似 Toggl”，也不是“覆盖核心时间追踪场景”，而是作为 Toggl 的长期兼容实现，在功能定义上对 Toggl 公开产品面持续保持兼容。

当前已确认并已收录到仓库中的兼容范围包括：

- `Track API v9`
- `Reports API v3`
- `Webhooks API v1`
- `docs/` 中整理出的公开功能面、领域对象与架构边界

用户希望 `OpenToggl` 同时满足以下现实需求：

- 作为开源产品，用户可以自托管部署。
- 作为官方服务，也提供云 SaaS。
- 云版与自托管版不能变成两套功能不同的产品，必须保持功能面一致。
- 现有基于 Toggl 公开 API 的脚本、自动化、内部工具和第三方集成，应尽可能无缝迁移。
- 现有 Toggl 数据可以导入到 OpenToggl 中，迁移后尽可能保留原始 ID，使链接、脚本、外部映射和历史引用继续有效。
- 除 API 外，还要提供一套覆盖全部能力的 Web 界面，不能把低频能力留在 API-only 状态。
- 在兼容 Toggl 的同时，提供一套对 AI 更友好的原生 API，帮助 AI 分析、检索、解释和操作数据。

现有时间追踪产品和开源替代方案通常只覆盖部分高频能力，缺少 Toggl 的完整 API 契约、报表能力、Webhook 运行时语义、账单与组织治理能力，因此无法承担“无明显能力退化的迁移目标”这一角色。

## Solution

构建 `OpenToggl`，作为 Toggl 公开产品面的长期兼容实现。

OpenToggl 首个正式版本即承诺：

- 完整兼容 `Track API v9`
- 完整兼容 `Reports API v3`
- 完整兼容 `Webhooks API v1`
- 提供与兼容 API 对应的完整 Web 界面
- 同时支持云 SaaS 与自托管，两者功能面一致
- 支持导入 Toggl 导出数据，作为首版唯一超出 Toggl 兼容面的新增能力
- 提供一套 `AI-friendly API`，作为 OpenToggl 的原生增强接口层

兼容的定义不是“路径和字段大体一致”，而是将以下内容都视为公开产品合同的一部分：

- 路径与 HTTP 方法
- 请求参数、过滤、排序、分页语义
- 请求体与响应体结构
- 鉴权方式
- 错误码与关键错误语义
- 限流与配额表达
- 报表统计口径
- Webhook 生命周期与运行时行为
- 订阅、账单、发票、配额等运营与商业接口
- Web 界面上的对应功能与操作流

OpenToggl 不承诺官方 Toggl 客户端可直接连接，因为公开 OpenAPI 兼容并不足以推出官方客户端兼容；但 OpenToggl 承诺公开 API 与对应公开功能面的完整兼容。

除兼容 API 之外，OpenToggl 还将提供一套独立的 `AI-friendly API`。这套 API 不受 Toggl 兼容合同约束，而是作为 OpenToggl 的原生增强能力，服务 AI agent、自动化分析、批处理与自然语言操作场景。

首版兼容基线以当前仓库中的 `openapi/` 与 `docs/` 为准。首版发布后，OpenToggl 的产品定位不是“冻结在某个 Toggl 版本的兼容快照”，而是持续跟踪 Toggl 官方公开 API 与公开文档的变化，并在后续版本中继续保持兼容。

这里的“持续兼容”采用版本化承诺，而不是不可验证的“永远兼容”口号。也就是说：

- 首版对当前公开兼容基线做完整兼容承诺。
- 后续版本持续跟踪 Toggl 官方公开变更。
- 每次变更通过兼容基线和兼容矩阵落成可审计、可 review、可验证的版本化承诺。

本 PRD 的兼容依据与官方资料来源，进一步整理见 `docs/compat-baseline.md`。

## User Stories

1. 作为现有 Toggl API 使用者，我希望现有脚本继续调用兼容 API，这样我不用重写自动化流程。
2. 作为集成开发者，我希望路径、方法、参数、响应结构都兼容，这样我可以直接复用现有客户端。
3. 作为集成开发者，我希望鉴权方式兼容，这样现有的认证代码无需重写。
4. 作为集成开发者，我希望错误码和关键错误语义兼容，这样异常处理逻辑保持有效。
5. 作为集成开发者，我希望分页、排序和过滤行为兼容，这样数据抓取和同步任务不会失效。
6. 作为依赖流量控制的客户端，我希望配额和限流相关响应头兼容，这样节流机制可以延续。
7. 作为组织管理员，我希望组织、工作区、成员、组、项目、客户端、任务、标签等对象都能按 Toggl 的方式管理，这样迁移后组织结构不需要重建。
8. 作为工作区管理员，我希望工作区级设置如默认币种、默认费率、四舍五入、时间显示和项目默认策略都可配置，这样现有工作方式保持不变。
9. 作为团队管理员，我希望权限模型兼容 WorkspaceUser、OrganizationUser、Group、ProjectUser 等对象，这样现有协作规则得以保留。
10. 作为团队管理员，我希望私有项目、管理员限制、可见性规则和成员费率语义兼容，这样权限边界不会变化。
11. 作为计时用户，我希望时间记录的创建、编辑、停止、批量更新和查询行为与 Toggl 一致，这样我的日常工作流不被打断。
12. 作为计时用户，我希望 running timer 语义兼容，这样计时器相关脚本和习惯可以直接迁移。
13. 作为高级用户，我希望 favorites、goals、reminders、timeline 等能力也存在，这样不会因为迁移而失去次要但真实使用的功能。
14. 作为审批流程使用者，我希望 timesheets 和 approvals 能继续使用，这样团队工时审核流程不断档。
15. 作为费用追踪用户，我希望 expenses 和相关附件能力存在，这样工时之外的成本数据也能管理。
16. 作为财务或管理者，我希望详细报表、汇总报表、周报、趋势、盈利和洞察能力完整可用，这样业务分析流程可以迁移。
17. 作为报表消费者，我希望相同数据在 OpenToggl 中得到尽量一致的报表结果，这样历史对账和新数据分析可以连续进行。
18. 作为需要导出数据的用户，我希望 CSV、PDF、XLSX 导出能力兼容，这样外部流程和归档方式保持不变。
19. 作为使用共享报表的用户，我希望保存报表、共享报表和共享链接继续有效，这样外部协作不会中断。
20. 作为 Webhook 集成方，我希望订阅、校验、事件过滤、签名、投递和重试行为兼容，这样下游系统无需大改。
21. 作为运维或管理员，我希望能在 Web 上查看并管理 webhook、投递状态、失败情况和相关限制，这样问题可以被诊断。
22. 作为组织所有者，我希望订阅、计划、发票、客户信息和账单相关接口兼容，这样管理流程和集成流程得以延续。
23. 作为管理员，我希望配额、状态、meta、审计相关能力存在，这样治理和诊断能力完整可用。
24. 作为审计使用者，我希望 audit logs 可查询、过滤和导出，这样合规与排障流程能迁移。
25. 作为自托管用户，我希望自托管版与云版功能一致，这样我不会因为部署方式而失去能力。
26. 作为 SaaS 用户，我希望云版与自托管版共享同一公开契约，这样迁移部署模型时不会出现功能断层。
27. 作为迁移用户，我希望能导入 Toggl 导出数据，这样我可以带着历史数据迁移。
28. 作为迁移用户，我希望导入后尽可能保留原始 ID，这样现有脚本、链接和外部系统映射继续有效。
29. 作为迁移用户，我希望导入后对象关系仍然完整，例如组织、工作区、项目、任务、标签、时间记录和成员关系不丢失。
30. 作为迁移操作者，我希望导入失败时能知道失败对象、冲突对象和部分成功结果，这样我可以修正后重试。
31. 作为 Web 用户，我希望所有兼容能力都有对应页面，而不是必须依赖 API 才能完成低频操作。
32. 作为管理员，我希望账单、配额、审计、导入和状态诊断等后台能力也有正式 Web 页面，这样无需直接查数据库。
33. 作为替代 Toggl 的采用者，我希望 OpenToggl 在产品定义上就是完整替代品，而不是一个只支持一半功能的兼容层。
34. 作为长期使用者，我希望 OpenToggl 不只是兼容某一个历史快照，而是能随着 Toggl 官方公开变更持续演进，这样我的集成不会因为上游变化而逐渐失效。
35. 作为平台使用者，我希望这种持续兼容是有版本记录和可审计基线的，这样我能知道某个版本到底对齐到哪一版公开契约。
36. 作为 AI agent 的使用者，我希望 OpenToggl 提供比 Toggl 兼容 API 更易理解、更高层的原生接口，这样 AI 能更稳定地分析和处理数据。
37. 作为 AI agent 的使用者，我希望这套原生接口既能做分析，也能做操作，这样 AI 不只会读数据，还能安全地执行工作流。

## Implementation Decisions

### 1. 兼容范围

- 首个正式版本即覆盖当前公开基线中的 `Track API v9`、`Reports API v3`、`Webhooks API v1` 的全部公开能力。
- “完全兼容”按功能定义和行为定义成立，不仅是 schema 层兼容。
- 公开 API 中的低频、边缘、运营、账单、审计、导出、状态类能力均在首版范围内，不能删减。
- 首版兼容基线以当前仓库中的 `openapi/` 与 `docs/` 为准。
- OpenToggl 的长期定位是“版本化持续兼容实现”，即后续版本需要持续跟踪 Toggl 官方公开 OpenAPI 与公开文档变化，并把新增或变化的公开能力纳入兼容范围。
- 持续兼容目标针对官方公开产品面，不针对未公开私有接口或官方客户端私有行为。
- 每次官方公开变更都应先更新兼容基线文档与兼容矩阵，再进入 PRD 变更或实施计划。
- 对后续公开变更应至少分成以下几类管理：
  - 新增公开能力
  - 既有 schema 变更
  - 既有行为/约束变更
  - 文档澄清但非行为变化
- PRD 承诺应以“已写入兼容基线和兼容矩阵的版本化范围”为准，而不是抽象的无限义务。

### 2. 顶层功能矩阵

必须完整覆盖以下产品面：

- Identity / Account
- Organization / Workspace
- Membership / Access Control
- Clients / Projects / Tasks / Tags
- Time Entries / Tracking Extensions
- Timesheets / Approvals / Expenses
- Audit / Governance / Status / Meta
- Reports API v3
- Webhooks API v1
- Billing / Subscription / Invoice / Plan / Quota
- Export / File / Calendar / Misc
- Import
- AI-friendly API
- 完整 Web UI

### 3. Identity / Account

必须完整覆盖：

- 用户注册、登录、登出
- 账户资料读取与更新
- 当前用户信息
- 用户偏好设置
- API token 管理与使用
- `Basic auth(email:password)` 兼容
- `Basic auth(api_token:api_token)` 兼容
- 会话兼容入口
- 与账户相关的公开安全状态字段
- 与身份、会话、账户相关的错误码和返回结构

### 4. Organization / Workspace

必须完整覆盖：

- 组织 CRUD
- 工作区 CRUD
- 组织与工作区关系
- 组织级和工作区级设置
- 默认币种、默认费率、四舍五入、显示策略等公开配置项
- 工作区 logo、头像、品牌资源
- 工作区用户和组织用户管理
- 邀请与成员状态
- 与套餐、限制、可用能力关联的工作区字段
- 工作区公开对象中的低频字段，例如 CSV upload 状态等

### 5. Membership / Access Control

必须完整覆盖：

- OrganizationUser
- WorkspaceUser
- Group
- GroupMember
- ProjectUser
- ProjectGroup
- 邀请、加入、移除、禁用、恢复等生命周期
- 角色与权限语义
- owner/admin/member 等兼容角色表现
- 成员费率、成本、可见性、访问规则
- 私有项目权限
- 仅管理员可创建、仅管理员可见等策略位
- 与成员管理相关的过滤、搜索、列表和批量操作

### 6. Work Catalog

必须完整覆盖：

- Clients
- Projects
- Tasks
- Tags
- 项目模板
- 项目 pin
- 项目统计和状态
- billable、颜色、费率、估时、实际时长等公开字段
- 项目与 client/task/member/group 的关系
- 标签和时间记录关联
- 批量修改与批量操作
- 搜索、过滤、归档、恢复、启停等公开行为

### 7. Tracking

必须完整覆盖：

- Time Entries 全生命周期
- 启动计时器、停止计时器、手动录入
- 批量读取和批量更新
- 描述、项目、任务、标签、billable、开始/结束时间、duration 等字段
- running timer 语义
- favorites
- goals
- reminders
- timeline
- timesheets
- approvals
- expenses
- 附件/文件相关能力
- 与时间追踪相关的公开低频端点

### 8. Governance / Audit / Policy

必须完整覆盖：

- audit logs
- 审批流相关对象和操作
- quota、status、meta 相关接口
- 数据保留与限制相关公开语义
- 组织和工作区治理能力
- 与治理、审计、诊断相关的对应 Web 界面

### 9. Reports / Analytics

必须完整覆盖：

- Reports API v3 全部公开端点
- detailed reports
- summary reports
- weekly reports
- comparative / trends / profitability / insights
- saved reports
- shared reports
- filters 和 search 系列能力
- clients / projects / users / time_entries 等过滤和搜索接口
- CSV / PDF / XLSX 导出
- 分享 token 与共享访问控制
- 报表分页、排序、聚合
- 时区切日、舍入、利润、汇率等统计口径的兼容
- 与 Track 数据的可回读一致性

### 10. Webhooks / Integrations

必须完整覆盖：

- Webhooks API v1 全部公开端点
- event filters
- limits
- status
- subscriptions CRUD
- ping / validate
- 订阅生命周期管理
- 事件过滤语义
- 校验流程
- 签名
- 投递记录
- 重试策略
- 失败停用
- 工作区级限制
- 与权限和可见性相关的事件暴露规则

### 11. Billing / Subscription / Plan

必须完整覆盖：

- 订阅计划
- plan 状态
- customer 相关公开对象
- 账单
- 发票
- 套餐能力与功能暴露
- 配额和限制
- 配额响应头与相关行为
- 工作区/组织与计划关联语义
- 即使底层计费实现不同，对外 API 契约仍需兼容

### 12. Export / File / Calendar / Misc

必须完整覆盖：

- CSV / PDF / XLSX 导出
- 导出任务与导出文件获取
- calendar integrations
- iCal
- dashboard
- status / meta
- avatars / logos
- 公开 API 中所有杂项但已暴露的能力
- 不因使用频率低而排除

### 13. Import

这是首版唯一允许超出 Toggl 兼容面的新增功能。

当前已确认的产品定义：

- 支持导入 Toggl 导出数据
- 目标是完成从 Toggl 到 OpenToggl 的迁移
- 导入后尽可能保留原始 ID
- 导入后对象关系完整可恢复
- 导入后的数据可通过兼容 API 和 Web 界面正常访问
- 导入后的脚本、链接、外部引用和映射应尽量保持可用

当前仍待后续脱敏样本确认的内容：

- 导出文件格式
- 字段映射规则
- 冲突处理规则
- 幂等导入策略
- 导入任务状态表达
- 局部失败回报方式

### 14. Web UI

首版 Web 必须覆盖以上全部兼容能力，至少包括：

- 用户与账户页面
- 组织、工作区、成员、组管理页面
- clients / projects / tasks / tags 管理页面
- 时间记录与计时器页面
- timesheets / approvals / expenses 页面
- reports / insights / exports / saved reports 页面
- webhooks 与集成管理页面
- billing / subscription / invoice / quota 页面
- audit / status / meta / settings 页面
- import 页面
- webhook delivery 诊断页面
- 配额与订阅诊断页面
- 导入任务与导入错误诊断页面

首版不允许把低频能力、管理员能力或运维能力保留为 API-only。

## Detailed Scope

### Time Entries / Projects / Membership

#### Time Entries

- 时间记录对象需要完整承载 `workspace_id`、`user_id`、`project_id`、`task_id`、`client_id`、`description`、`billable`、`start`、`stop`、`duration`、`created_with`、`tags` 等兼容语义。
- 必须完整支持创建、更新、删除、单条读取、批量读取、批量更新、按时间范围/用户/项目/任务/标签/描述过滤、since 增量同步、停止运行中时间记录等能力。
- running timer 必须作为兼容产品语义单独实现，包括开始、停止、冲突处理、持续时间与开始/结束时间的关系、运行中状态读取。
- 时间语义必须兼容 RFC3339 风格输入输出、UTC 存储、用户时区展示、跨日与跨时区行为，并为报表口径提供一致事实来源。
- Web 端必须提供时间记录列表、计时器入口、创建/编辑表单、批量编辑、过滤视图、团队查看与 timesheet 联动页面。

#### Projects

- 项目对象必须承载 `client_id`、`name`、`active`、`billable`、`private`、`color`、`currency`、`estimated_seconds`、`actual_seconds`、`fixed_fee`、`rate`、`pinned` 等兼容语义。
- 必须完整支持创建、查看、更新、删除、归档/恢复、激活/停用、批量修改、模板、pin/unpin、统计与 periods 等能力。
- billable、private、rate、fixed_fee、currency、estimated_seconds 等属性必须对时间记录默认行为、报表和盈利分析产生兼容影响。
- 必须完整支持项目与 client、tasks、project users、project groups、time entries、reports 的关联关系。
- Web 端必须提供项目列表、详情、创建/编辑、成员管理、任务管理、统计视图、模板视图和私有项目权限管理。

#### Membership

- Membership 是一级产品面，不是内部附属表结构。
- 必须完整支持 WorkspaceUser、OrganizationUser、Group、GroupMember、ProjectUser、ProjectGroup 的对象与生命周期。
- 需要支持成员邀请、角色管理、移除、激活/停用、费率/成本设置、可见性和私有项目授权。
- 成员语义必须影响项目可见性、时间记录可创建性、报表可见范围、Webhook 事件暴露和盈利口径。
- Web 端必须提供组织成员页、工作区成员页、邀请状态页、组管理页、项目成员页、费率/成本设置页、权限配置页。

### Reports API v3

- `Reports API v3` 是独立产品面，不是 Track API 的附加查询层。
- 必须完整兼容 detailed reports、summary reports、weekly reports、comparative、trends、profitability、insights、saved reports、shared reports、filters、search、CSV/PDF/XLSX 导出。
- 报表兼容要求包括接口存在、结果口径、分页、排序、权限模型、导出和共享行为。
- 详细报表必须支持 time_entries 搜索、高级过滤、分页、排序、导出和行级结果展开。
- 汇总报表必须支持按 client/project/user 等维度聚合，并兼容 totals、breakdown、billable/cost/revenue/profit 等公开语义。
- 周报必须兼容周切分、时区切日和周视图导出。
- trends / profitability / insights 必须兼容趋势分析、盈利分析、洞察与对应导出能力。
- saved reports 和 shared reports 必须作为公开产品对象存在，支持保存、更新、删除、共享 token、共享访问控制和共享导出。
- filters / search 是报表 API 的正式组成部分，必须兼容对象过滤器和搜索返回结构。
- 报表口径必须兼容时区切日、舍入、费率、成本、利润、货币与权限可见性。
- Web 端必须提供详细报表、汇总报表、周报、趋势/盈利/洞察页、保存报表、共享设置、筛选器和导出入口。

进一步约束见 `docs/reports-semantics.md`。
逐端点矩阵见 `docs/reports-endpoint-matrix.md`。

### Webhooks API v1

- `Webhooks API v1` 首版完整兼容。
- 兼容对象不仅是 subscription CRUD，还包括 event filters、validation、ping、status、limits、签名、投递、重试、失败停用和诊断能力。
- subscription 需要完整承载 workspace 绑定、callback URL、filters、验证状态、启用状态、失败状态等兼容语义。
- 必须支持 event filters 查询与配置，并兼容过滤表达和匹配规则。
- 必须支持 validate / ping 等验证流程及其状态演进。
- 运行时行为必须兼容业务事件触发、事件匹配、delivery 记录、请求体与 headers、签名、timeout/retry/backoff、失败终态与停用语义。
- Webhook 不能绕过权限模型，私有项目、成员权限和工作区边界必须影响事件可见性。
- limits 必须以 workspace 为边界表达当前数量和上限，并与计划/订阅关联。
- Web 端必须提供 subscriptions 列表、创建/编辑、filters 配置、validation/ping、delivery history、failure attempts、limits、status 和健康诊断页面。

进一步约束见 `docs/webhooks-delivery-contract.md`。

### Billing / Subscription / Invoice

- 账单与订阅不是可选附属功能，而是当前公开 API 的正式组成部分。
- 首版必须完整兼容公开可见的 billing、subscription、invoice、payment、customer、plan、quota 相关能力。
- 必须覆盖组织级和工作区级的订阅查询能力，包括 plan、plan_name、pricing_plan、trial、seat 数量、状态、周期和相关公开字段。
- 必须覆盖公开的 customer 相关能力，包括 customer 读取、创建、更新、默认支付方式、折扣、promotion code 与相关状态表达。
- 必须覆盖公开的 subscription 生命周期能力，包括创建、更新、取消、trial、payment_failed、invoice_summary、discount_request、upgrade_request、usage_based_discount、setup_intent 等公开接口与对应语义。
- 必须覆盖 invoices、payment_records、payment_receipts、purchase_orders 等账单文件与记录能力。
- 必须覆盖公共套餐与组织套餐查询能力，包括 `/subscriptions/plans`、`/workspaces/plans`、`/organizations/{organization_id}/plans` 等公开能力。
- 必须覆盖 `me/quota` 与其他 quota/plan 相关响应语义，并将 quota headers 与配额剩余、窗口重置时间视为兼容合同的一部分。
- `402 Payment Required`、计划不支持某项功能、workspace 需要升级等错误语义，必须按兼容产品行为处理，而不是仅返回泛化错误。
- 即使底层支付、计费、开票由 OpenToggl 自己实现，对外公开 API 的对象形状、关键状态、关键流程和错误语义仍需兼容。
- Web 端必须提供 billing 管理页、subscription 管理页、plans/limits 查看页、invoice 列表与下载页、payment 相关状态页、customer 编辑页、quota 查看页。

进一步约束见 `docs/billing-contract.md`。
逐端点矩阵见 `docs/billing-endpoint-matrix.md`。

### Import

- `import` 是首版唯一允许超出 Toggl 当前兼容面的新增产品功能。
- import 的目标不是做通用 ETL，而是完成从 Toggl 到 OpenToggl 的迁移闭环。
- import 必须支持导入 Toggl 导出数据，并在导入后通过兼容 API 与 Web 界面正常访问。
- import 必须尽可能保留原始对象 ID，包括 organization、workspace、user、client、project、task、tag、time_entry 及其公开关联对象。
- import 必须尽可能保留对象之间的引用关系，尤其是：
  - organization 与 workspace
  - workspace 与 members
  - client 与 project
  - project 与 task
  - time_entry 与 user/project/task/tag/client
  - membership 与 private project 授权关系
- import 后必须尽可能保证已有脚本、链接、外部映射和报表引用继续有效。
- import 需要被定义为正式产品能力，而不是一次性内部迁移脚本，因此必须具备任务状态、失败明细、冲突展示、可重试和诊断能力。
- 当前在未取得脱敏样本前，不承诺具体导出文件结构、字段映射、幂等键、冲突优先级和局部失败回执格式；这些内容保留为待确认项。
- Web 端必须提供 import 页面、导入任务列表、冲突/失败诊断页和重试入口。

进一步约束见 `docs/import-migration-contract.md`。

### Export / File / Calendar / Misc

- 公开 API 中的导出、文件、头像/logo、calendar integrations、iCal、dashboard、status、meta 等能力都在首版兼容范围内。
- 导出能力必须覆盖 CSV、PDF、XLSX 及其对应的下载和错误语义。
- 文件能力必须覆盖公开可见的 avatar、logo、expense attachment、导出文件等对象或文件访问能力。
- calendar integrations 与 iCal 相关公开能力必须保留，不能因为使用率低而从首版删减。
- dashboard、status、meta 及其他公开杂项端点也必须作为兼容合同的一部分保留。
- Web 端必须提供这些能力的对应页面或正式入口，不能只留下孤立 API。

### AI-friendly API

- `AI-friendly API` 是 OpenToggl 的原生增强接口层，不属于 Toggl 兼容合同的一部分。
- 该接口层与 Compatibility API、Web UI 共用同一套底层领域模型和权限体系。
- 该接口层同时覆盖两类能力：
  - 分析型能力
  - 操作型能力
- 分析型能力至少应支持：
  - 面向 AI 的高层检索
  - 时间记录、项目、成员、报表的聚合查询
  - 异常检测、趋势解释、归因分析、摘要生成所需的结构化数据访问
  - 比 Toggl 兼容 API 更适合 agent 消费的稳定对象视图
- 操作型能力至少应支持：
  - 通过高层接口创建、更新、删除 time entries、projects、tags、reports 等对象
  - 批量操作
  - 面向 agent 的幂等、安全执行与结果回执
  - 比 Toggl 兼容 API 更适合自然语言驱动工作流的命令式接口
- `AI-friendly API` 必须是显式独立产品面，不能把 AI 能力偷偷混入 Toggl 兼容合同。
- `AI-friendly API` 的具体资源模型、权限边界和安全约束，建议后续单独成文。

## Testing Decisions

- 本 PRD 暂不定义详细验收矩阵和逐端点测试计划。
- 当前只定义功能与行为范围。
- 后续测试原则应只验证对外可观察行为，而不绑定内部实现细节。
- 重点测试对象后续至少应覆盖：
  - API 合同层
  - 产品行为层
  - 报表结果层
  - Webhook 运行时行为层
  - Billing / Subscription / Quota 行为层
  - 导入迁移层
  - Web 界面操作层
- 与报表、Webhook、账单、配额、导入相关的测试应特别强调运行时语义，而不仅是 schema。

## Out of Scope

- 除 `import` 外，任何超出 Toggl 当前兼容面的新增产品功能。
- 官方 Toggl Web、移动端、桌面客户端的直接兼容或无缝替换。
- 技术栈、编程语言、框架、基础设施选型。
- 详细验收方案、自动化测试矩阵和实施计划。
- 在未拿到脱敏样本前，对 Toggl 导出格式和导入字段映射做过度具体化承诺。
- 未来 Toggl 新增公开能力的自动兼容义务。

说明：

- `AI-friendly API` 不属于“超出 Toggl 兼容面的随意新增功能”，而是已确认的原生产品面。

## Further Notes

- `OpenToggl` 的核心定位不是“开源时间追踪工具”，而是“当前公开 Toggl 产品面的完整兼容实现”。
- “完全兼容”必须在 PRD 中被具体能力清单支撑，不能只保留抽象口号。
- 你的产品策略可以提供更宽松额度，但不能破坏与 Toggl 兼容的计划、配额、限制和相关接口表达。
- 后续仍需继续细化至少以下模块：
  - 逐对象字段与逐端点兼容矩阵
  - AI-friendly API 资源模型与安全边界
