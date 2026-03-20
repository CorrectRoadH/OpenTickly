# OpenToggl Product Definition

## 目标

`OpenToggl` 的目标不是做一个“类似 Toggl”的时间追踪工具，而是直接按 Toggl 当前公开产品面来定义 OpenToggl 自己的产品。

首个正式版本直接定义为：

- 覆盖 `Track API v9`
- 覆盖 `Reports API v3`
- 覆盖 `Webhooks API v1`
- 提供与这些公开 API 对应的完整 Web 界面
- 同时支持云 SaaS 与自托管，两者功能面一致
- 支持导入 Toggl 导出数据，作为首版超出 Toggl 当前公开业务产品面的新增业务能力
- 提供实例级管理与平台运营能力，作为 OpenToggl 自己的宿主能力面

## 定义方式

OpenToggl 不把“兼容”当成额外目标，而是直接把 Toggl 当前公开定义视为自己的产品定义来源。

首版产品定义采用以下输入分工：

- `openapi/*.json` 是 API 兼容实现的强约束来源
- Figma 原型是 UI 界面与交互兼容实现的强约束来源
- `docs/product/*.md` 只补充 OpenAPI 与 Figma 无法完整表达的功能细节

也就是说，以下内容都直接按上游公开定义来定义：

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

产品文档不重复抄写 OpenAPI 或 Figma 本身；只定义两者未完整覆盖、但实现必须遵守的产品细节。

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

## 上游输入

实现和 PRD 编写时，应直接引用：

- `openapi/toggl-track-api-v9.swagger.json`
- `openapi/toggl-reports-v3.swagger.json`
- `openapi/toggl-webhooks-v1.swagger.json`
- OpenToggl Figma 原型

## 共同产品原则

- 首版不允许把低频能力、管理员能力或运维能力保留为 API-only。
- 对外公开定义优先于内部实现命名与存储模型。
- 自托管版与云版共享同一公开契约与功能面。
- 除 `import` 外，首版不承诺超出 Toggl 当前公开业务产品面的新增业务功能。
- `instance-admin` 属于 OpenToggl 自己的实例 / 宿主能力，不计入上一条对业务产品面的限制。
- 与 AI/自动化相关的承诺仅限公开 OpenAPI、CLI 与 skill 接口友好，不额外承诺独立的 AI API 产品面。

## 版本化对齐

- 首版对当前公开基线做完整对齐承诺。
- 后续版本持续跟踪 Toggl 官方公开变更。
- 每次变更都应先更新 OpenAPI、Figma 或对应 PRD，再进入领域建模和实施计划。
