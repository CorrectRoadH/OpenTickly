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
- `Basic auth(email:password)` 公开入口
- `Basic auth(api_token:api_token)` 公开入口
- 会话公开入口
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
- 停用用户的历史数据在列表、报表、审批、审计中仍应可见，并按引用的公开定义表达其非活跃状态。
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

## 页面映射（Figma / Screenshot）

### Figma 原型读取规则

- 本文件引用的 Figma 文件为 `https://www.figma.com/design/IiuYyZAD0bWx9C8BxetnFc/OpenToggl`。
- 读取身份与租户相关原型时，不要从整张 `Page 1` 的 metadata 里猜页面归属；应直接使用本册记录的页面入口。
- 本册只记录 `profile` 与 `settings` 两个页面入口；同一 Figma page 下的 timer、project、client、integrations webhooks 等页面不在本册展开。

### 按目标页面选择 MCP 入口

- 需要 account-scoped workspace context overview 时，使用同一 Figma 文件中的 `overview` layer；当前若 node id 尚未在本文固化，先以 layer 名称 `overview` 和 screenshot fallback 对齐，不要回退到 timer 页面。
- 需要当前用户资料与个人偏好页时，直接调用 `profile`，node `10:14814`。
- 需要 workspace / organization 设置页时，直接调用 `settings`，node `11:3680`。
- 如果需求讨论的是账号入口下的当前 workspace 上下文、组织/工作区概览、当前访问范围，默认落到 `overview`，而不是 `timer` 或 `settings`。
- 如果需求讨论的是账户资料、偏好、安全状态、用户自助入口，默认落到 `profile`。
- 如果需求讨论的是 workspace / organization 配置、默认币种、默认费率、rounding、显示策略、logo / avatar 等设置，默认落到 `settings`。
- 如果本文已经给出 node id，默认直接对该 node 调 `get_metadata` / `get_design_context` / `get_screenshot`，不要先对 `Page 1` 做全量 metadata 再靠文本搜索找页面。
- 若目标页面不是 `overview`、`profile` 或 `settings`，则这份 PRD 不是 MCP 入口来源，应回到对应产品 PRD 取 node。

### Overview

- Figma：同一文件中的 `overview` layer
- Screenshot fallback：[shell-overview.png](../testing/evidence/ui-parity-baseline/shell-overview.png)
- 产品含义：这是账号级 `overview` 页面，用来展示当前 organization / workspace 上下文与当前访问范围；它与 `timer` 分离，不承载 time-entry 主工作流。
- URL 约束：上游入口为 `https://track.toggl.com/overview`。这是账号级页面，不通过 `workspace_id` 进入。
- 实现要求：页面展示当前 workspace 名称、当前 organization、当前角色、默认配置摘要与当前上下文说明；workspace 只是当前上下文，不是 overview pathname 的一部分。

### Profile

- Figma：`profile`，node `10:14814`
- Screenshot：当前没有对应截图，先以 Figma 为主参考
- 产品含义：这是当前用户的账户资料与个人偏好页面，归属 `Identity / Account`，不是 workspace 设置页。
- 实现要求：页面应围绕当前用户信息、个人偏好、账户级安全状态和账户入口组织，不把 workspace 配置、subscription 或实例级治理能力混进同一个页面。

### Settings

- Figma：`settings`，node `11:3680`
- Screenshot：当前没有对应截图，先以 Figma 为主参考
- 产品含义：这是 workspace / organization 设置页面，归属 `Organization / Workspace`，与 `profile` 明确分离。
- 实现要求：logo/avatar、默认币种、默认费率、rounding、显示策略、低频 workspace 设置都应从这里进入；billing / subscription 如需展示，也应作为关联信息或跳转入口，不应把 billing 产品面整体并入本页。

## Web 要求

Web 端必须完整承接本册定义的正式产品能力，不允许把本册定义的任何正式能力保留为 API-only。

Web 端的正式页面与入口包括：

- 账号级 overview 页面
- 登录 / 注册 / 偏好设置页面
- 用户资料页
- 组织与工作区管理页
- 工作区设置页
- logo / avatar 管理入口
