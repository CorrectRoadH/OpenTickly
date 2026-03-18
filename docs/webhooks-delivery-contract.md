# Webhooks Delivery Contract

## 目的

将 `Webhooks API v1` 的投递合同和运行时语义单独定义，避免只兼容 CRUD 接口。

## 当前结论

- Webhooks 兼容范围包括 filters、validation、signature、delivery、retry、disable、limits 和 status。
- 本文档定义对外投递合同，不限定内部消息总线或任务系统实现。

## 合同范围

本合同覆盖：

- subscriptions
- event filters
- validate
- ping
- status
- limits
- delivery runtime
- signature
- retries / failure / disable
- delivery history / attempts

## 核心原则

### 1. Webhook 合同的重点是运行时，而不是 CRUD

- 仅兼容 subscription CRUD 不算兼容。
- 事件何时触发、如何签名、何时重试、何时停用，才是下游真正依赖的合同。

### 2. 至少一次投递，允许重复

当前默认规则：

- Webhook 投递按“至少一次”语义定义。
- 不承诺严格仅一次。
- 下游必须能够依赖事件 ID 或等价标识做幂等。

### 3. 不承诺全局顺序，但需要稳定顺序语义

当前默认规则：

- 不承诺跨资源、跨 subscription 的全局有序。
- 后续若需局部顺序，应以“同一 subscription 下同一资源的局部顺序”为上限，而不是更强承诺。

## Subscription 合同

至少应兼容：

- 创建、更新、部分更新、删除
- 启用/停用状态
- 验证状态
- filters 配置
- workspace 绑定
- callback URL
- 失败/健康相关状态

默认规则：

- subscription 是一等产品对象。
- 非法状态、无权限、超限、验证失败等情况必须优先返回兼容错误类别。

## Filters 合同

至少应兼容：

- 可用 event filters 查询
- subscription 上的 filter 配置
- filter 匹配对投递结果的影响

默认规则：

- filter 判断在事件路由阶段完成，而不是在 callback 返回后补救。
- 空 filter、非法 filter、重复 filter 的行为必须固定。

## Validate / Ping 合同

至少应兼容：

- validate
- ping
- 验证成功/失败状态变化
- 重试验证入口

默认规则：

- validate 与 ping 是公开生命周期动作，不是内部调试工具。
- subscription 的可投递状态必须与验证状态一致。

## Delivery 运行时合同

### 投递语义

当前默认规则：

- 至少一次投递
- 允许重复
- 每条 delivery 需要稳定事件标识
- 请求体与签名基于同一原文负载

### 超时与重试

当前默认规则：

- timeout、最大尝试次数、退避算法必须是固定合同，不得按节点实现漂移
- 对于可重试失败与不可重试失败必须有不同处理路径
- 达到终态后必须可观察

### 失败与停用

当前默认规则：

- 重复失败可导致 subscription 被停用或进入异常状态
- 失败停用不是静默行为，必须可在 API 与 Web 中观察
- 手动恢复或重新验证入口必须存在

## Signature 合同

至少应兼容：

- secret 参与签名
- 签名头或等价公开字段
- 回调接收方可验证的签名语义

默认规则：

- 签名基于实际发送的原始 payload，而不是重序列化后的对象
- secret 更新后的行为必须固定

## 权限与可见性合同

这是高风险区，必须写死基本原则。

当前默认规则：

- Webhook 不能绕过权限模型
- 事件是否可见，按事件产生时的资源归属和权限快照判断，而不是按投递时的当前可见性重新解释
- 后续权限变化不会修改已生成 delivery 的事实内容，但可以影响未来新事件是否产生

这条规则的目的，是避免私有项目、成员移除、权限变更导致历史事件“忽隐忽现”。

## Limits 合同

至少应兼容：

- workspace 级限制查询
- 当前数量 / 上限语义
- 超限时创建或更新 subscription 的错误行为

## Delivery History / Attempts

至少应兼容：

- delivery history 可观察
- attempts 可观察
- success / failure / disabled / validation-related 状态可区分

## 待确认项

- timeout、最大重试次数、退避算法的精确值
- 局部顺序是否需要更强承诺
- delivery / attempts 的完整字段矩阵
- validate 失败后的恢复细节

## 与 PRD 的关系

该文档用于支撑 `docs/prd.md` 中 Webhooks API v1 章节。
