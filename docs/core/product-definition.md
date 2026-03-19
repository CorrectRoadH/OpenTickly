# OpenToggl Product Definition

## 目标

`OpenToggl` 的目标不是做一个“类似 Toggl”的时间追踪工具，而是直接按 Toggl 当前公开产品面来定义 OpenToggl 自己的产品。

首个正式版本直接定义为：

- 覆盖 `Track API v9`
- 覆盖 `Reports API v3`
- 覆盖 `Webhooks API v1`
- 提供与这些公开 API 对应的完整 Web 界面
- 同时支持云 SaaS 与自托管，两者功能面一致
- 支持导入 Toggl 导出数据，作为首版唯一超出 Toggl 当前公开产品面的新增能力

## 定义方式

OpenToggl 不把“兼容”当成额外目标，而是直接把 Toggl 当前公开定义视为自己的产品定义来源。也就是说，以下内容都直接按 Toggl 公开定义来定义：

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

公开定义见 [toggl-public-definition](./toggl-public-definition.md)。

## 产品分册

产品定义按功能拆分，不再集中维护在单个 PRD 中：

- [identity-and-tenant](../product/identity-and-tenant.md)
- [membership-and-access](../product/membership-and-access.md)
- [tracking](../product/tracking.md)
- [reports-and-sharing](../product/reports-and-sharing.md)
- [Webhooks](../product/Webhooks.md)
- [billing-and-subscription](../product/billing-and-subscription.md)
- [importing](../product/importing.md)
- [instance-admin](../product/instance-admin.md)

## 合同文档

以下专题合同用于补充公开行为和运行时语义：

- [reports](../contracts/reports.md)
- [reports-endpoint-matrix](../contracts/reports-endpoint-matrix.md)
- [billing](../contracts/billing.md)
- [billing-endpoint-matrix](../contracts/billing-endpoint-matrix.md)
- [Webhooks](../contracts/Webhooks.md)
- [importing](../contracts/importing.md)

## 共同产品原则

- 首版不允许把低频能力、管理员能力或运维能力保留为 API-only。
- 对外公开定义优先于内部实现命名与存储模型。
- 自托管版与云版共享同一公开契约与功能面。
- 除 `import` 外，首版不承诺超出 Toggl 当前公开产品面的新增功能。
- 与 AI/自动化相关的承诺仅限公开 OpenAPI、CLI 与 skill 接口友好，不额外承诺独立的 AI API 产品面。

## 版本化对齐

- 首版对当前公开基线做完整对齐承诺。
- 后续版本持续跟踪 Toggl 官方公开变更。
- 每次变更都应先更新公开基线与专题合同，再进入产品定义或实施计划。
