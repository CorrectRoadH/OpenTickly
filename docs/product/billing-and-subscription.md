# 账单与订阅

## Goal

这一册定义 plan、subscription、invoice、customer、quota 与 feature exposure 这些公开商业能力怎么表现。

## 范围

本文件定义：

- billing / subscription / invoice / customer / plan / quota

本文件的强约束输入：

- 对应 billing 相关 OpenAPI 定义
- 对应 Figma billing / subscription 页面原型

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
- 组织级 / 工作区级 subscription 视图、customer、invoice、payment、quota、feature gating 等具体公开行为必须与上游 OpenAPI 和 Figma 兼容。

## Product Rules

- organization 与 workspace 都可能暴露 subscription 相关公开入口，但 subscription 的业务本体只有一套，不得被实现成两套真相。
- feature gating 的事实来源由 billing 定义，各业务模块只负责在自己的用例里检查；返回语义和 headers 规则必须与上游 OpenAPI 兼容。
- 即使 self-hosted 没有官方 SaaS 支付后台，plan / subscription / invoice / customer / quota 的公开对象和状态表达仍然必须存在。

## Edge Cases

- workspace 级 subscription 视图默认理解为 organization 合同在 workspace 视角下的公开表达。
- 计划降级后已有超限对象如何处理，必须采用固定规则；默认不静默删除历史对象。

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
