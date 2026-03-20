# Webhooks

## Goal

这一册定义 Webhooks 作为独立产品面的公开行为，包括 subscription、filters、validation、delivery、retry、limits 和 failure handling。

## 范围

本文件定义 `Webhooks API v1` 的产品面。

本文件的强约束输入：

- `openapi/toggl-webhooks-v1.swagger.json`
- 对应 Figma `Integrations / Webhooks` 页面原型

## 必须完整覆盖

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

## Product Rules

- Webhook 不能绕过权限模型，私有项目、成员权限和工作区边界必须影响事件可见性。
- Webhook 的公开价值不只是 CRUD，还包括：
  - 事件过滤
  - endpoint 验证
  - delivery 记录
  - retry / disable 运行时语义
  - limits / status
- validation、ping、签名、timeout、retry、disable 必须是正式产品行为，并与 OpenAPI 和 Figma 兼容。

## Edge Cases

- 当订阅 owner、workspace 权限或私有项目可见性变化时，事件暴露范围必须随之变化，而不是继续按旧权限发送。
- 手动 ping / validate 与真实 delivery 的状态必须彼此可区分。

## Open Questions

- retry/backoff 的精确参数、超时阈值和 noisy subscription 阈值，仍需继续在本 PRD 与实现中写死。
- 事件目录与 payload shape 仍需继续收敛成更完整的公开定义。

## 页面映射（Figma / Screenshot）

- `Integrations / Webhooks`
  - Figma：`integrations webhooks`，node `12:3561`
  - Screenshot：当前没有对应截图，先以 Figma 为主参考
  - 产品含义：这是当前首版唯一正式支持的 integration 页面入口。虽然导航上可以叫 `Integrations`，但在首版中它实际承载的是 `Webhooks` 产品面，而不是通用 integrations marketplace。
  - 实现要求：页面需要直接承载 subscriptions、filters、validation / ping、delivery history、failure attempts、limits、status 和健康诊断；如果 UI 暂时保留其他 integration 名称，只能作为未实现占位，不得暗示已有其他未实现 integration 能力。

## Web 要求

Web 端必须完整承接 Webhooks 产品面的正式能力，不允许把本册定义的正式能力保留为 API-only。

Web 端的正式页面与入口包括：

- subscriptions 列表
- 创建 / 编辑
- filters 配置
- validation / ping
- delivery history
- failure attempts
- limits
- status
- 健康诊断页面
