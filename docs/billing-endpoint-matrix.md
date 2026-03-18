# Billing Endpoint Matrix

## 目的

把 billing / subscription / invoice / quota 相关公开端点整理成逐端点兼容矩阵，作为 `docs/billing-contract.md` 的补充。

## 使用方式

每个端点条目至少标注：

- 路径与方法
- 能力分组
- 官方摘要
- 官方已明确的关键行为
- 主要证据来源
- 当前实现风险

## 端点矩阵

### 1. Quota / Limits

#### `GET /me/quota`

- 能力分组：quota
- 官方摘要：API quota for the current user
- 官方已明确的关键行为：
  - 返回当前用户在各组织维度下的 quota
  - 与总览页中的 quota headers 语义相互对应
- 主要证据来源：
  - `openapi/toggl-track-api-v9.swagger.json`
  - `docs/toggl-official/engineering.toggl.com/docs/index.html`
- 当前实现风险：
  - 中，主要在 product quota 与 technical rate limit 的关系

### 2. Plans / Currencies

#### `GET /subscriptions/plans`

- 能力分组：plans
- 官方摘要：Get all available plans and features
- 官方已明确的关键行为：
  - 返回所有可用 plans 与 feature 列表
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 低

#### `GET /workspaces/plans`

- 能力分组：plans
- 官方摘要：Public Subscription Plans
- 官方已明确的关键行为：
  - 返回公开 subscription plans
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 低

#### `GET /organizations/{organization_id}/plans`

- 能力分组：plans
- 官方摘要：Returns pricing plans for an organization
- 官方已明确的关键行为：
  - 组织视角下的 pricing plans
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `GET /organizations/{organization_id}/plans/{plan_id}`

- 能力分组：plans
- 官方摘要：Returns pricing plan for an organization identified by plan_id
- 官方已明确的关键行为：
  - 单个 plan 查询
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 低

#### `GET /currencies`

- 能力分组：subscription / dictionaries
- 官方摘要：Currencies
- 官方已明确的关键行为：
  - 返回 available currencies
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 低

#### `GET /workspaces/{workspace_id}/currencies`

- 能力分组：subscription / dictionaries
- 官方摘要：Get workspace currencies
- 官方已明确的关键行为：
  - 返回 workspace 可用 currencies
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 低

### 3. Organization Subscription Lifecycle

#### `GET /organizations/{organization_id}/subscription`

- 能力分组：subscription
- 官方摘要：Returns subscription data
- 官方已明确的关键行为：
  - 返回 organization subscription 对象
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `PUT /organizations/{organization_id}/subscription`

- 能力分组：subscription
- 官方摘要：Allows to update existing unified subscription for an organization
- 官方已明确的关键行为：
  - `pricing_plan_tag` 为 required
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中高

#### `POST /organizations/{organization_id}/subscription`

- 能力分组：subscription
- 官方摘要：Allows to create a new unified subscription for an organization
- 官方已明确的关键行为：
  - `pricing_plan_tag` 为 required
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中高

#### `DELETE /organizations/{organization_id}/subscription`

- 能力分组：subscription
- 官方摘要：Cancels an existing subscription
- 官方已明确的关键行为：
  - 有公开参数区分“立即取消”与“期末取消”
  - 公开错误示例包含 `subscription not found`
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中高

#### `POST /organizations/{organization_id}/subscription/cancellation_feedback`

- 能力分组：subscription
- 官方摘要：Subscription cancellation feedback
- 官方已明确的关键行为：
  - 取消反馈是正式公开动作
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /organizations/{organization_id}/subscription/discount_request`

- 能力分组：subscription
- 官方摘要：Discount request
- 官方已明确的关键行为：
  - 用于取消 plan 时提交反馈并触发支持邮件
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /organizations/{organization_id}/subscription/feature_upsell_multi`

- 能力分组：subscription / upsell
- 官方摘要：Get feature upsell for multiple organizations
- 官方已明确的关键行为：
  - 提供多个组织的 feature upsell 信息
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `GET /organizations/{organization_id}/subscription/invoice_summary`

- 能力分组：subscription / invoice
- 官方摘要：Invoice Summary
- 官方已明确的关键行为：
  - 返回 next invoice summary
  - 接受 quantity 与 pricing_plan_tag 等查询语义
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 高

#### `GET /organizations/{organization_id}/subscription/payment_failed`

- 能力分组：subscription / payment
- 官方摘要：Subscription Payment Failed
- 官方已明确的关键行为：
  - 返回 payment failed details
  - 官方错误描述包含 “Subscription not found.”
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 高

#### `POST /organizations/{organization_id}/subscription/trial`

- 能力分组：subscription / trial
- 官方摘要：Allows to create a new unified subscription on initial 30-day trial
- 官方已明确的关键行为：
  - 组织 trial 是正式公开动作
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中高

#### `DELETE /organizations/{organization_id}/subscription/trial`

- 能力分组：subscription / trial
- 官方摘要：Cancels an active trial
- 官方已明确的关键行为：
  - 公开错误示例包含 `trial not found`
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /organizations/{organization_id}/subscription/upgrade_request/{feature_id}`

- 能力分组：subscription / upsell
- 官方摘要：Upgrade request for a feature
- 官方已明确的关键行为：
  - 用于触发对管理员的升级 CTA
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /organizations/{organization_id}/subscription/usage_based_discount`

- 能力分组：subscription / discount
- 官方摘要：apply usage based discount
- 官方已明确的关键行为：
  - 用于应用 usage based discount
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中高

#### `DELETE /organizations/{organization_id}/subscription/usage_based_discount`

- 能力分组：subscription / discount
- 官方摘要：remove usage based discount
- 官方已明确的关键行为：
  - 用于移除 usage based discount
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

### 4. Customer / Promotion / Setup Intent

#### `GET /organizations/{organization_id}/subscription/customer`

- 能力分组：customer
- 官方摘要：Retrieve unified customer
- 官方已明确的关键行为：
  - 返回 unified customer belonging to organization
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `PUT /organizations/{organization_id}/subscription/customer`

- 能力分组：customer
- 官方摘要：Update unified customer
- 官方已明确的关键行为：
  - `customer name`、`email`、`country`、`postal code` 为必填
  - 可选字段不提供值时会被清空
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 高

#### `POST /organizations/{organization_id}/subscription/customer`

- 能力分组：customer
- 官方摘要：Create unified customer
- 官方已明确的关键行为：
  - 创建 unified customer
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /organizations/{organization_id}/subscription/promocode`

- 能力分组：promotion
- 官方摘要：Applies promotion code
- 官方已明确的关键行为：
  - 若 customer 已有 promotion code，会被覆盖
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中高

#### `DELETE /organizations/{organization_id}/subscription/promocode`

- 能力分组：promotion
- 官方摘要：Removes promotion code
- 官方已明确的关键行为：
  - 移除 organization customer 上的 discount
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /organizations/{organization_id}/subscription/setup_intent`

- 能力分组：payment setup
- 官方摘要：Create a setup intent for collecting customer's payment method
- 官方已明确的关键行为：
  - 面向 future payments 收集支付方式
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 高

### 5. Invoices / Payment Records / Files

#### `GET /organizations/{organization_id}/invoices/{invoice_uid}.pdf`

- 能力分组：invoice file
- 官方摘要：InvoicePdf
- 官方已明确的关键行为：
  - 返回 invoice PDF
  - 错误示例含 `Invalid organization id` / `No invoice found`
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `GET /organizations/{organization_id}/payment_records`

- 能力分组：payment records
- 官方摘要：Returns paid invoices
- 官方已明确的关键行为：
  - 支持 `is_unified`
  - 支持基于 last invoice ID 的分页/游标语义
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 高

#### `GET /organizations/{organization_id}/subscription/purchase_orders/{purchase_order_uid}.pdf`

- 能力分组：purchase order
- 官方摘要：PurchaseOrderPdf
- 官方已明确的关键行为：
  - 返回 purchase order PDF
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `GET /workspaces/{workspace_id}/invoices`

- 能力分组：user-invoices
- 官方摘要：Get workspace invoices
- 官方已明确的关键行为：
  - workspace invoice 列表支持分页
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /workspaces/{workspace_id}/invoices`

- 能力分组：user-invoices
- 官方摘要：Create user invoice
- 官方已明确的关键行为：
  - 创建 user invoice
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中高

#### `GET /workspaces/{workspace_id}/invoices/{invoice_id}.pdf`

- 能力分组：invoice file
- 官方摘要：InvoicePdf
- 官方已明确的关键行为：
  - 返回 workspace invoice PDF
  - 错误示例含 `Admin permissions required`
  - 错误示例含 `Not authorized to access invoice {invoice_id}`
  - 错误示例含 `No invoice found`
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `DELETE /workspaces/{workspace_id}/invoices/{user_invoice_id}`

- 能力分组：user-invoices
- 官方摘要：Delete user invoice
- 官方已明确的关键行为：
  - 删除 user invoice
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `GET /workspaces/{workspace_id}/payment_receipts/{payment_id}.pdf`

- 能力分组：payment receipt
- 官方摘要：PaymentReceipts
- 官方已明确的关键行为：
  - 返回 payment receipt PDF
  - 错误示例含 payment not found / country not found
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

### 6. Workspace Subscription View

#### `GET /workspaces/{workspace_id}/subscription`

- 能力分组：subscription view
- 官方摘要：Subscription
- 官方已明确的关键行为：
  - 返回 workspace subscription data
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `GET /workspaces/{workspace_id}/subscription/purchase_orders/{purchase_order_id}.pdf`

- 能力分组：purchase order
- 官方摘要：PurchaseOrderPdf
- 官方已明确的关键行为：
  - workspace 视图下可下载 purchase order
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

## 备注

- 这份矩阵主要依据 Track v9 OpenAPI，因为官方 docs 对 billing 运行时语义披露远少于 reports。
- 对 setup intent、payment failure、usage-based discount 等条目，当前只能较可靠地锁定“端点与对象合同”，无法仅靠公开 docs 锁死所有副作用细节。
