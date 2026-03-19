# 身份与租户

## Goal

这一册定义用户、账户、organization、workspace 及其直接可见行为。这里不讨论代码归属，只讨论产品怎么表现。

## 范围

本文件定义以下产品面：

- Identity / Account
- Organization / Workspace
- 用户生命周期中的账号级语义

## Identity / Account

必须完整覆盖：

- 用户注册、登录、登出
- 账户资料读取与更新
- 当前用户信息
- 用户偏好设置
- API token 管理与使用
- `Basic auth(email:password)` 兼容
- `Basic auth(api_token:api_token)` 兼容
- 会话兼容入口
- 与账户相关的公开安全状态字段
- 与身份、会话、账户相关的错误码和返回结构

## Product Rules

- 公开登录方式按 Toggl 当前公开定义来定义，包括密码登录、API token 使用与会话入口。
- Identity 对外必须同时支持 API 和 Web 两套入口，不允许把低频账号管理能力藏成 API-only。
- 用户偏好、当前用户信息和账户安全状态必须是正式产品对象，而不是仅前端缓存状态。

## Organization / Workspace

必须完整覆盖：

- 组织 CRUD
- 工作区 CRUD
- 组织与工作区关系
- 组织级和工作区级设置
- 默认币种、默认费率、四舍五入、显示策略等公开配置项
- 工作区 logo、头像、品牌资源
- 工作区用户和组织用户管理
- 邀请与成员状态
- 与套餐、限制、可用能力关联的工作区字段
- 工作区公开对象中的低频字段，例如 CSV upload 状态等

## Workspace / Organization Rules

- `organization` 与 `workspace` 都是正式产品资源。
- organization 负责承载跨 workspace 的管理与聚合视角。
- workspace 负责承载大多数日常业务对象与操作入口。
- 如果同一类商业状态在 organization 与 workspace 下都可见，workspace 视图默认理解为 organization 合同在 workspace 视角下的公开表达，而不是另一套独立真相。
- 工作区的默认币种、默认费率、rounding、显示策略等设置都必须影响 tracking 与 reports 的公开行为。

## 用户生命周期

- 用户停用与删除必须作为正式产品语义定义，而不是实现细节。
- 停用（deactivated）与删除（deleted）必须区分：
  - 停用表示账号不可继续登录、不可继续创建或修改业务对象，但历史数据仍保留。
  - 删除不得默认级联删除历史 time entries、expenses、approvals、audit 记录等已产生业务事实。
- 停用用户的历史数据在列表、报表、审批、审计中仍应可见，并以兼容方式表达其非活跃状态。
- 如果用户在被停用时存在 running timer，系统应在停用生效时自动停止该 timer，避免继续生成脏数据。
- 对“真删除”公开行为，如果当前公开定义不能证明 Toggl 会物理清除历史事实，则 OpenToggl 默认采用“身份不可再用，但历史业务事实保留”的保守策略。
- 上述规则若与后续明确确认的 Toggl 公开行为冲突，以公开定义更新后的公开语义为准。

## Edge Cases

- 停用用户的历史 time entries、expenses、approvals、audit logs 默认继续可见。
- 停用用户重新恢复后，不自动恢复被停用时已经被系统停止的 running timer。
- organization / workspace 被删除或停用时，不自动推导其历史业务事实从 reports 中消失。

## Open Questions

- Toggl 对“真删除用户”是否真的物理清空所有历史业务事实，目前仍需继续确认。
- organization 与 workspace 双入口下某些低频字段的精确差异，仍需继续从公开资料确认。

## Web 要求

Web 端至少提供：

- 登录 / 注册 / 偏好设置页面
- 用户资料页
- 组织与工作区管理页
- 工作区设置页
- logo / avatar 管理入口
