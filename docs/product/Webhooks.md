# Webhooks

## Goal

这一册定义 Webhooks 作为独立产品面的公开行为，包括 subscription、filters、validation、delivery、retry、limits 和 failure handling。

## 范围

本文件定义 `Webhooks API v1` 的产品面。

投递、重试、失败治理等更细公开语义见：

- [Webhooks 合同](../contracts/Webhooks.md)

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
- limits 必须以 workspace 为边界表达当前数量和上限，并与计划/订阅关联。
- Webhook 的公开价值不只是 CRUD，还包括：
  - 事件过滤
  - endpoint 验证
  - delivery 记录
  - retry / disable 运行时语义
  - limits / status
- validation、ping、签名、timeout、retry、disable 必须是正式产品行为，而不是隐藏在内部运维里的实现细节。

## Edge Cases

- callback endpoint 超时、返回 4xx/5xx、重复失败时，必须进入固定的 retry / terminal state 行为。
- noisy subscription 不得无限重试；到达阈值后必须进入用户可见的失败状态。
- 当订阅 owner、workspace 权限或私有项目可见性变化时，事件暴露范围必须随之变化，而不是继续按旧权限发送。
- 手动 ping / validate 与真实 delivery 的状态必须彼此可区分，不能混成同一条模糊记录。

## Open Questions

- retry/backoff 的精确参数、超时阈值和 noisy subscription 阈值，仍需继续在专题合同里写死。
- 事件目录与 payload shape 仍需继续收敛成更完整的公开定义。

## Web 要求

Web 端必须提供：

- subscriptions 列表
- 创建 / 编辑
- filters 配置
- validation / ping
- delivery history
- failure attempts
- limits
- status
- 健康诊断页面
