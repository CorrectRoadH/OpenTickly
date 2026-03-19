# 账单与订阅

## Goal

这一册定义 plan、subscription、invoice、customer、quota 与 feature exposure 这些公开商业能力怎么表现。

## 范围

本文件定义：

- billing / subscription / invoice / customer / plan / quota

更细公开语义与端点矩阵见：

- [billing 合同](../contracts/billing.md)
- [billing-endpoint-matrix](../contracts/billing-endpoint-matrix.md)

## 必须完整覆盖

- 订阅计划
- plan 状态
- customer 相关公开对象
- 账单
- 发票
- 套餐能力与功能暴露
- 配额和限制
- 配额响应头与相关行为
- 工作区 / 组织与计划关联语义
- 即使底层计费实现不同，对外公开对象与状态表达仍需一致

## 产品约束

- 账单与订阅不是可选附属功能，而是当前公开 API 的正式组成部分。
- 必须覆盖组织级和工作区级的订阅查询能力，包括 plan、plan_name、pricing_plan、trial、seat 数量、状态、周期和相关公开字段。
- 必须覆盖 customer 读取、创建、更新、默认支付方式、折扣、promotion code 与相关状态表达。
- 必须覆盖 subscription 生命周期能力，包括创建、更新、取消、trial、payment_failed、invoice_summary、discount_request、upgrade_request、usage_based_discount、setup_intent 等公开接口与对应语义。
- 必须覆盖 invoices、payment_records、payment_receipts、purchase_orders 等账单文件与记录能力。
- 必须覆盖 `me/quota` 与其他 quota/plan 相关响应语义，并将 quota headers 与配额剩余、窗口重置时间视为兼容合同的一部分。
- `402 Payment Required`、计划不支持某项功能、workspace 需要升级等错误语义，必须按兼容产品行为处理，而不是仅返回泛化错误。

## Product Rules

- organization 与 workspace 都可能暴露 subscription 相关公开入口，但 subscription 的业务本体只有一套，不得被实现成两套真相。
- feature gating 的事实来源由 billing 定义，各业务模块只负责在自己的用例里检查并返回正确公开错误。
- `402`、quota headers、plan state、trial、seat 相关行为必须在 API 与 Web 中保持同一解释。
- 即使 self-hosted 没有官方 SaaS 支付后台，plan / subscription / invoice / customer / quota 的公开对象和状态表达仍然必须存在。

## Edge Cases

- workspace 级 subscription 视图默认理解为 organization 合同在 workspace 视角下的公开表达。
- 计划降级后已有超限对象如何处理，必须采用固定规则；默认不静默删除历史对象。
- 计费 provider 更换、setup intent 失败、payment failed 等运行时状态必须保留为正式产品状态，而不是内部日志。

## Open Questions

- 某些低频 billing 端点的字段细节与状态组合，仍需继续从公开资料确认。
- seat / plan / quota 在个别组织级和工作区级视图上的字段差异，仍需继续核实。

## Web 要求

Web 端至少提供：

- billing 管理页
- subscription 管理页
- plans / limits 查看页
- invoice 列表与下载页
- payment 相关状态页
- customer 编辑页
- quota 查看页
