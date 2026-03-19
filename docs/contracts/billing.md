# Billing Contract

## 目的

将 billing / subscription / invoice / payment / quota 的公开合同单独定义，避免它们混杂在总产品定义中。

## 当前结论

- billing 是首版公开产品面的一部分，不是后续可选功能。
- 即使底层计费实现不同，对外公开对象、关键状态和关键错误语义也必须一致。
- 本文档只定义公开合同，不定义内部支付、开票、清结算实现。

## 官方是怎么做的

当前 Toggl 官方公开资料在 billing 这一块的特点是：

- 独立 docs 章节相对少
- Track v9 OpenAPI 暴露的端点与对象明显比文档站里单独成章的内容更完整
- 因此 billing 合同需要以 OpenAPI 为主，以官方总览页的通用规则为辅

当前从官方公开资料可明确看到的做法包括：

- `GET /me/quota`
  - 返回当前用户在各组织维度下的 API quota
- 组织级 billing / subscription 面
  - `GET /organizations/{organization_id}/plans`
  - `GET /organizations/{organization_id}/plans/{plan_id}`
  - `GET/PUT/POST/DELETE /organizations/{organization_id}/subscription`
  - `POST /organizations/{organization_id}/subscription/cancellation_feedback`
  - `GET/POST/PUT /organizations/{organization_id}/subscription/customer`
  - `POST /organizations/{organization_id}/subscription/discount_request`
  - `GET /organizations/{organization_id}/subscription/invoice_summary`
  - `GET /organizations/{organization_id}/subscription/payment_failed`
  - `PUT/DELETE /organizations/{organization_id}/subscription/promocode`
  - `GET /organizations/{organization_id}/invoices/{invoice_uid}.pdf`
  - `GET /organizations/{organization_id}/payment_records`
  - `GET /organizations/{organization_id}/subscription/purchase_orders/{purchase_order_uid}.pdf`
  - `POST /organizations/{organization_id}/subscription/setup_intent`
  - `POST/DELETE /organizations/{organization_id}/subscription/trial`
  - `POST /organizations/{organization_id}/subscription/upgrade_request/{feature_id}`
  - `POST/DELETE /organizations/{organization_id}/subscription/usage_based_discount`
- 公共 plan 面
  - `GET /subscriptions/plans`
  - `GET /workspaces/plans`
- 工作区 billing 面
  - `GET /workspaces/{workspace_id}/subscription`
  - `GET/POST /workspaces/{workspace_id}/invoices`
  - `GET /workspaces/{workspace_id}/invoices/{invoice_id}.pdf`
  - `DELETE /workspaces/{workspace_id}/invoices/{user_invoice_id}`
  - `GET /workspaces/{workspace_id}/payment_receipts/{payment_id}.pdf`

官方总览页还明确了几条 billing 相关的全局规则：

- `402 Payment Required`
  - 代表当前 workspace 需要升级才能访问某项能力
- `429 Too Many Requests`
  - 需要退避
- quota 是公开产品行为的一部分
  - 通过 `X-Toggl-Quota-Remaining`
  - 通过 `X-Toggl-Quota-Resets-In`

因此，OpenToggl 不能把 billing 简化成“只有套餐页和一个布尔开关”。官方公开面本身已经把 subscription / customer / invoice / quota / receipt / purchase order 做成了正式 API 合同。

## 合同范围

本合同覆盖以下公开能力：

- `subscription`
- `plans`
- `customer`
- `invoice`
- `payment record`
- `payment receipt`
- `purchase order`
- `trial`
- `promocode / discount`
- `setup_intent`
- `quota`
- 与计划相关的 feature gating 和错误语义

## 逐能力矩阵

### A. Quota

- 主要端点
  - `GET /me/quota`
- 官方明确行为
  - 公开返回当前用户在各组织维度下的 quota
  - quota headers 包括：
    - `X-Toggl-Quota-Remaining`
    - `X-Toggl-Quota-Resets-In`
  - 存在组织维度与用户维度两类 quota
- 官方明确规则
  - organization-specific 请求的额度与 plan 相关
  - user-specific 请求额度固定更低
  - 另有 technical rate limit，`429` 时需退避
- 证据强度
  - 强：官方总览 docs + OpenAPI

### B. Plans

- 主要端点
  - `GET /subscriptions/plans`
  - `GET /workspaces/plans`
  - `GET /organizations/{organization_id}/plans`
  - `GET /organizations/{organization_id}/plans/{plan_id}`
- 官方明确行为
  - 公开列出 available plans 和 features per plan
  - 组织视图和公共视图都存在
- 证据强度
  - 强：OpenAPI

### C. Organization Subscription

- 主要端点
  - `GET/PUT/POST/DELETE /organizations/{organization_id}/subscription`
  - `POST /organizations/{organization_id}/subscription/cancellation_feedback`
  - `GET /organizations/{organization_id}/subscription/invoice_summary`
  - `GET /organizations/{organization_id}/subscription/payment_failed`
  - `POST /organizations/{organization_id}/subscription/trial`
  - `DELETE /organizations/{organization_id}/subscription/trial`
  - `POST /organizations/{organization_id}/subscription/upgrade_request/{feature_id}`
  - `POST/DELETE /organizations/{organization_id}/subscription/usage_based_discount`
- 官方明确行为
  - 组织级 subscription 是完整生命周期对象，不只是读取接口
  - trial、取消、付款失败、升级请求、discount 都有单独入口
  - 删除 subscription 时支持“立即取消”或“期末取消”的公开参数
- 证据强度
  - 强：OpenAPI

### D. Customer / Promotion / Payment Setup

- 主要端点
  - `GET/POST/PUT /organizations/{organization_id}/subscription/customer`
  - `PUT/DELETE /organizations/{organization_id}/subscription/promocode`
  - `POST /organizations/{organization_id}/subscription/setup_intent`
  - `POST /organizations/{organization_id}/subscription/discount_request`
- 官方明确行为
  - customer 是正式公开对象
  - promotion code 可以应用与移除
  - setup intent 是正式公开动作
  - customer 的部分字段为必填，未给值时可清空可选字段
- 证据强度
  - 强：OpenAPI

### E. Invoices / Payment Records / Purchase Orders

- 主要端点
  - `GET /organizations/{organization_id}/invoices/{invoice_uid}.pdf`
  - `GET /organizations/{organization_id}/payment_records`
  - `GET /organizations/{organization_id}/subscription/purchase_orders/{purchase_order_uid}.pdf`
  - `GET/POST /workspaces/{workspace_id}/invoices`
  - `GET /workspaces/{workspace_id}/invoices/{invoice_id}.pdf`
  - `DELETE /workspaces/{workspace_id}/invoices/{user_invoice_id}`
  - `GET /workspaces/{workspace_id}/payment_receipts/{payment_id}.pdf`
- 官方明确行为
  - 既有组织级账单文件，也有工作区级 invoice 视图
  - 存在 paid invoices / payment records
  - 存在 receipt 和 purchase order 文件下载
  - 公开错误示例中包含权限不足、对象不存在、组织非法等类别
- 证据强度
  - 强：OpenAPI

### F. Workspace Subscription View

- 主要端点
  - `GET /workspaces/{workspace_id}/subscription`
  - `GET /workspaces/{workspace_id}/subscription/purchase_orders/{purchase_order_id}.pdf`
- 官方明确行为
  - workspace 也有 subscription 读取视图
  - purchase order 在 workspace 视图下也可下载
- 证据强度
  - 强：OpenAPI

## 明确写死的官方行为

以下行为已被官方公开资料写死，不应被 OpenToggl 弱化：

- `402 Payment Required` 表示当前 workspace 需要升级后才能访问能力
- quota 通过公开 headers 表达
- quota 同时具有 product quota 与 technical rate limit 两层机制
- plans / features 是公开 API 面，不只是 marketing 页面
- subscription 不只是读取，还包含 create / update / cancel / trial / failure / discount 等完整生命周期

## 主要空白区

以下内容官方公开资料未完全写透，OpenToggl 需要自己补规则，但不能假装官方已有足够说明：

- setup intent 与真实支付网关的最小公开语义
- payment failed 后的全部恢复路径
- promotion / discount 的精细优先级
- unified invoices / unified customer 的完整行为差异

## 核心原则

### 1. 公开对象优先于内部实现一致

- OpenToggl 可以使用自己的内部计费系统。
- 但对外暴露的对象结构、关键状态、关键流程和关键错误语义必须一致。
- 目标是“现有调用方仍把 OpenToggl 视为 Toggl 风格的 billing surface”。

### 2. 账单与配额分开建模

为避免概念混乱，必须区分三层语义：

- 商业计划与功能门控
  - 某功能是否可用
  - 某资源数量是否受套餐限制
- API quota / rate limit
  - 当前请求窗口剩余额度
  - quota headers
- 发票与支付状态
  - 是否已付费
  - 是否存在失败支付
  - 下一张发票/历史记录

这三层可以互相影响，但不能在实现或 PRD 中混成同一个概念。

### 3. 402 与 feature gating 是公开合同

- `402 Payment Required` 不是泛化错误。
- 当某项能力需要升级套餐才能使用时，应优先沿用公开错误码与错误语义。
- 这里的公开要求包括：
  - 返回时机
  - 返回码
  - 关键错误信息类别
  - 与 plan/feature gating 的对应关系

官方 OpenAPI 也在多个功能点直接把套餐约束写进错误描述，例如：

- 某些 workspace 设置仅 Premium 可用
- billable rates 仅 Starter 及以上套餐可用
- pinned projects 数量随 free/paid plan 不同而不同

### 4. Feature Gating 检查与返回语义

feature gating 的判断事实来源于 billing surface，但检查发生在发起该业务动作的模块中。

检查规则：

- `billing` 暴露 plan / feature / commercial quota 的判定结果
- 具体业务模块在自己的 `application` 用例中执行 gating 检查
- `transport` 只负责把 gating 失败映射为公开错误
- 前端隐藏入口只是提示，不是最终裁决

返回语义：

- 因 plan 不支持或商业配额受限
  - 返回 `402 Payment Required`
- 因 API quota / rate limit 超限
  - 返回 `429`
- 因权限不足或对象不可见
  - 返回 `403`
- 因参数非法、对象状态非法、领域不变量失败
  - 不返回 `402`

检查点：

- 变更型请求在进入主写事务前检查
- gated 查询和导出在执行重型查询或登记导出 job 前检查
- 长时任务的公开入口在创建任务时检查；后续任务执行是否再次校验，按公开合同语义决定

## 公开对象与语义

### Subscription

至少应覆盖以下语义：

- 组织级 subscription
- 工作区级 subscription 查询视图
- 计划标识
- 计划名称
- seat 数量
- trial 状态
- enterprise / premium / starter / free 等计划属性表达
- active / canceled / cancel_at_period_end / payment_failed 等关键状态
- 账期、创建时间、当前周期等关键字段

默认规则：

- 组织级 subscription 是主要商业合同对象。
- 工作区级 subscription 视图如果在公开 API 中存在，应被视为组织级合同在 workspace 视角下的投影，而不是另一套独立真相。

### Plans

至少应覆盖以下语义：

- 公共 plans 列表
- 组织可用 plans 列表
- 单个 plan 查询
- plan features 暴露
- 价格结构与周期结构

默认规则：

- plan 列表是公开产品能力的一部分。
- feature gating 不能只在 UI 里体现，必须与公开 plan 数据与错误语义保持一致。

### Customer

至少应覆盖以下语义：

- customer 创建
- customer 查询
- customer 更新
- customer 名称、邮箱、国家、邮编等关键字段
- 默认支付方式
- 折扣和 promotion code 状态

默认规则：

- customer 是订阅合同的关联对象。
- 如果某些内部字段不存在，可以不公开，但公开字段必须稳定返回或按公开语义为空。

### Invoices / Payment Records / Receipts / Purchase Orders

至少应覆盖以下语义：

- 发票列表
- 单个发票 PDF 下载
- payment records 列表
- payment receipt 下载
- purchase order 下载
- 分页、游标和统一账单相关公开参数

默认规则：

- 文件下载类接口属于合同的一部分，不能只在 UI 中留“查看历史账单”而缺失原始文件能力。
- 未找到、无权限、对象不属于该组织/工作区时，应优先返回公开错误码与公开错误类别。

## 生命周期能力

### 支持的订阅操作

首版应覆盖以下公开操作：

- 查询 subscription
- 创建 subscription
- 更新 subscription
- 取消 subscription
- cancellation feedback
- discount request
- invoice summary
- payment failed 查询
- promocode 应用/移除
- setup intent
- trial 创建
- upgrade request
- usage based discount

### 状态机要求

即使底层支付体系不同，也必须定义一致的外部状态机，至少涵盖：

- free
- active paid
- trialing
- cancel_at_period_end
- canceled
- payment_failed

如果内部系统状态更多，可以内部扩展；但对外不得削弱公开状态表达。

## Quota 合同

### Quota 的含义

Quota 在公开合同中至少包括：

- 当前窗口剩余额度
- 当前窗口总额度
- 重置时间或剩余时间
- user / organization 维度的表达

### 默认规则

- quota 是公开响应合同，不等同于内部限流实现。
- 即使 OpenToggl 给用户更宽松额度，也应保留同样的 quota 表达方式。
- `me/quota` 与响应头中的 quota 信息必须在语义上自洽。

官方公开资料当前明确两层控制：

- product quota
  - 组织维度额度与 plan 相关
  - 用户维度额度更低
  - 响应头使用 `X-Toggl-Quota-Remaining` 与 `X-Toggl-Quota-Resets-In`
- technical rate limit
  - 建议安全速率约 `1 req/sec`
  - 超限返回 `429`

## Self-Hosted 约束

本合同不要求现在就锁定自托管的内部支付实现，但要求先锁定对外语义：

- 自托管版不能因为没有官方 SaaS 支付后台就删掉 billing surface。
- 自托管版至少要能返回同样的 subscription/customer/invoice/quota 对象和状态。
- 自托管版是否支持真实在线扣款，留作后续实现决策；但这不影响公开合同先行定义。

## 待确认项

- setup_intent 与真实支付网关绑定的最小公开语义
- unified invoices / unified customer 的精确行为细节
- promotion code / usage based discount 的边界行为
- payment failed 相关对象的完整字段与重试语义

## 与 PRD 的关系

该文档用于支撑 `docs/product/billing-and-subscription.md`。

逐端点矩阵见 `docs/contracts/billing-endpoint-matrix.md`。
