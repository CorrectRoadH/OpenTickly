# 成员与权限

## Goal

这一册定义成员、角色、组、私有项目授权以及它们如何影响 tracking、reports、billing 和 Webhooks 的可见性。

## 范围

本文件定义：

- Membership / Access Control
- 成员费率与成本设置
- 角色、可见性和私有项目授权

## 对象范围

必须完整覆盖：

- `OrganizationUser`
- `WorkspaceUser`
- `Group`
- `GroupMember`
- `ProjectUser`
- `ProjectGroup`

## 生命周期与权限

必须支持：

- 邀请、加入、移除、禁用、恢复等生命周期
- owner / admin / member 等公开角色表现
- 成员费率、成本、可见性、访问规则
- 私有项目权限
- 仅管理员可创建、仅管理员可见等策略位
- 与成员管理相关的过滤、搜索、列表和批量操作

## Product Rules

- owner / admin / member 等角色必须按 Toggl 当前公开定义来定义，不允许在首版擅自简化成更少角色。
- 成员状态至少需要区分：已邀请、已加入、已禁用、已恢复。
- 项目级授权和组级授权必须是正式产品能力，不能只靠“看不见 UI 按钮”实现权限隔离。
- 私有项目的访问权限必须同时影响：
  - 项目可见性
  - time entry 可创建性
  - reports 可见性
  - webhook 事件暴露
- 成员费率与成本设置必须对 billable、cost、profitability 产生一致影响。

## 产品约束

- 成员语义必须影响项目可见性、时间记录可创建性、报表可见范围、Webhook 事件暴露和盈利口径。
- 成员费率与成本设置必须对 billable / profitability 结果产生一致影响。
- 停用成员不得继续产生新的业务变更，但其历史业务事实默认保留。

## Edge Cases

- 被移除或停用的成员，其历史 time entries 默认仍保留在 reports 和审计结果中。
- 如果成员失去某个私有项目访问权，历史 time entry 的归属不变，但后续读取与可见范围必须按当前权限重新裁剪。
- 若组织成员、工作区成员、项目成员三层关系同时存在冲突，应以更窄的业务作用域规则优先生效，而不是默认取最宽权限。

## Open Questions

- Toggl 对 project manager 一类中间角色是否存在稳定公开定义，仍需继续确认。
- 某些成员状态在 API 与 Web UI 的公开字段差异，仍需继续收集。

## Web 要求

Web 端必须完整承接本册定义的正式产品能力，不允许把本册定义的任何正式能力保留为 API-only。

Web 端的正式页面与入口包括：

- 组织成员页
- 工作区成员页
- 邀请状态页
- 组管理页
- 项目成员页
- 费率 / 成本设置页
- 权限配置页
