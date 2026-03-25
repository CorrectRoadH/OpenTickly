# 时间追踪

> Mission status
> Agent: global-running-timer-contract-and-regressions
> Status: complete
> Current code differences: Updated Edge Cases wording from "同一用户在同一 workspace 下" to "同一用户全局只能有一个 running timer（跨所有 workspace）" to reflect the mission-authoritative global per-user rule.
> Todo: none
> Fully implemented: yes

## Goal

这一册定义 time entry、running timer、projects/clients/tasks/tags、timesheets/approvals/expenses 的用户可见行为。

## 范围

本文件定义：

- Time Entries
- running timer
- Projects / Clients / Tasks / Tags
- timesheets / approvals / expenses
- favorites / goals / reminders / timeline

本文件的强约束输入：

- `openapi/toggl-track-api-v9.swagger.json`
- 对应 Figma timer / project / client / tag / tracking 相关页面原型

本文件只补充 OpenAPI 与 Figma 无法完整表达的功能细节。

## API 要求

- tracking 不仅要提供对应 Web 页面，还必须完整实现 `Track API v9` 中属于 tracking 产品面的公开接口。
- 至少包括：
  - time entries
  - running timer
  - projects
  - clients
  - tasks
  - tags
  - approvals
  - expenses
  - favorites
  - goals
  - reminders
- 如果某项能力在产品上被视为 tracking 正式功能，就不能只做 Web，不做对应公开 API。

## Product Rules

- tracking 是日常使用最频繁的产品面，API 和 Web 必须共享同一套公开行为。
- time entry、project、task、tag、billable、rate 之间的关系必须在创建、编辑、停止、批量更新和报表读取时保持同一解释。
- running timer 不是 UI 特性，而是正式产品状态。
- favorites、goals、reminders、timeline 即使使用频率较低，也属于正式产品面，不能在首版中被静默删掉。

## Time Entries

- 时间记录对象需要完整承载 `workspace_id`、`user_id`、`project_id`、`task_id`、`client_id`、`description`、`billable`、`start`、`stop`、`duration`、`created_with`、`tags` 等公开定义语义。
- 必须完整支持创建、更新、删除、单条读取、批量读取、批量更新、按时间范围/用户/项目/任务/标签/描述过滤、since 增量同步、停止运行中时间记录等能力。
- `GET /me/time_entries`、`GET /me/time_entries/current`、`GET /me/time_entries/{time_entry_id}` 属于当前账号的公开读模型；返回边界是 current user，可返回该账号在多个 workspace 下的事实数据。
- `GET /me/time_entries/current` 当没有运行中的时间条目时返回 `200` + body `null`；这是正式产品语义，不是错误状态，客户端应据此处理而不是依赖 404 响应。
- `workspace_id` 仍然是每条 time entry 的正式字段和写入归属；`POST /workspaces/{workspace_id}/time_entries`、`PATCH /workspaces/{workspace_id}/time_entries/{time_entry_id}/stop` 等 workspace 路由负责显式写入上下文。
- Timer 页面族展示的是当前 workspace 上下文下的 time entries 投影。页面可以基于 `/me/time_entries` 读模型取数，但最终 UI 只允许展示 `workspace_id == current workspace` 的条目；来自其他 workspace 或其他 organization 的 time entries 不得在当前 timer 视图中出现。
- 当用户切换当前 workspace 或 organization 后，`calendar`、`list`、`timesheet` 三个视图都必须立即切到新的 workspace 作用域；前一个 workspace 的历史 time entries 必须从当前 timer 视图消失。
- running timer 必须作为正式产品语义单独实现，包括开始、停止、冲突处理、持续时间与开始/结束时间的关系、运行中状态读取。
- 时间语义必须按引用的公开定义实现 RFC3339 风格输入输出、UTC 存储、用户时区展示、跨日与跨时区行为，并为报表口径提供一致事实来源。
- Web timer header 的运行时长必须基于当前 running entry 的 `start` 时间实时显示；不要把 raw negative duration 直接当成已消逝秒数渲染。
- Web timer header 的开始与停止是两个不同的可见状态，必须使用不同图标；当前 Figma / screenshot 未定义的 trailing overflow 按钮不得擅自保留在 timer 控制区。

## Projects / Clients / Tasks / Tags

- 项目对象必须承载 `client_id`、`name`、`active`、`billable`、`private`、`color`、`currency`、`estimated_seconds`、`actual_seconds`、`fixed_fee`、`rate`、`pinned` 等公开定义语义。
- 必须完整支持创建、查看、更新、删除、归档/恢复、激活/停用、批量修改、模板、pin/unpin、统计与 periods 等能力。
- `billable`、`private`、`rate`、`fixed_fee`、`currency`、`estimated_seconds` 等属性必须对时间记录默认行为、报表和盈利分析产生一致影响。
- 必须完整支持项目与 client、tasks、project users、project groups、time entries、reports 的关联关系。

## Billable Rate Resolution

- 与 billable amount 相关的费率来源必须有唯一且跨产品面一致的优先级。
- 当前默认优先级定义为：
  - time entry 显式 rate override
  - project rate
  - workspace member / user rate
  - workspace 默认 rate
- 当上层 rate 为 `null` 或未设置时，必须明确回落到下一层，而不是在不同页面使用不同解释。
- 历史 rate 变更不得默默改写已审批、已导出、已共享或已结算的历史结果。
- 若后续公开定义证明 Toggl 的公开行为不同，以公开定义和对应合同更新后的规则为准。

## Timesheets / Approvals

- approvals 必须有明确状态机，至少覆盖：
  - `pending`
  - `approved`
  - `rejected`
  - `reopened`
- 当前默认审批权限为 workspace admin / owner；只有在公开定义明确证明存在其他公开 approver 角色时，才扩展到其他角色。
- `pending -> approved`、`pending -> rejected`、`approved -> reopened`、`rejected -> reopened` 必须是显式状态流转。
- 当前默认规则是：
  - 普通成员不能直接修改已 approved 数据
  - 具备管理权限的操作者若强制修改，approval 必须回到 `reopened`
- approver 被停用后，不得继续产生新的审批动作；其历史审批记录仍应保留。

## Expenses

- expenses 必须有明确状态机，至少覆盖：
  - `draft`
  - `submitted`
  - `approved`
  - `rejected`
  - `reimbursed`
- expense attachment 必须作为正式产品能力定义，不能仅作为底层文件上传。
- 当前默认规则是附件可选，除非后续公开定义明确证明 Toggl 在特定策略下要求必附凭证。
- attachment 必须有明确的大小、格式和数量限制，并通过公开错误语义对外表达。
- expense 必须保留原始币种与原始金额；如存在工作区展示币种或报表换算币种，换算规则必须明确且可审计。
- 若发生币种换算，必须保留原始金额、原始币种、换算目标币种和所使用的汇率快照；已 approved 或已 reimbursed 的历史 expense 不得因后续汇率变化而静默重算。

## Edge Cases

- 同一用户全局只能有一个 running timer（跨所有 workspace）；发生冲突时，必须有固定处理规则，而不是由不同入口各自决定。
- time entry 的 `start/stop/duration` 之间出现不自洽输入时，必须返回固定错误，而不是在不同入口做不同自动修正。
- archived project、停用成员等状态变化，不得静默抹掉历史 time entries。
- rate、billable、currency 这类会影响 reports 和 billing 结果的字段，不得在 tracking 页面和报表页面出现不同解释。

## Open Questions

- running timer 并发冲突的精确公开行为，仍需继续对照 Toggl 公开资料确认。
- favorites、goals、reminders、timeline 的低频字段和边界行为，仍需继续从公开资料补齐。

## 页面映射（Figma / Screenshot）

### Figma 原型读取规则

- 本文件引用的 Figma 文件为 `https://www.figma.com/design/IiuYyZAD0bWx9C8BxetnFc/OpenToggl`。
- 读取这个文件的 tracking 相关原型时，必须先以 `Page 1` 左侧 `Layers` 面板中的顶层 layer 清单建立页面索引，再进入具体 node；不能把大页面下 `get_metadata(nodeId=0:1)` 一次返回的截断结果当成真实顶层结构。
- 当前 `Page 1` 中属于 tracking 的顶层 layer 清单为：
  - `left nav`
  - `timer calendar mode`
  - `timer timesheet mode`
  - `project list`
  - `timer listview`
  - `client`
- 本册只记录 tracking 自己负责的页面入口；`profile`、`settings`、`integrations webhooks` 虽然也在同一个 Figma page 下，但应分别在各自 PRD 中记录，不在本册展开。
- 当 MCP / metadata 返回内容不完整时，正确做法是先用 Figma `Layers` 面板确认顶层 layer 名称，再按本文和其他 PRD 中已记录的 node id 读取目标页面；不能根据一次截断响应推断某个页面原型不存在。

### Figma MCP 调用顺序

- 只想确认这个 Figma 文件有几个 page 时，调用 `get_metadata(nodeId="0:0")`，从 `document` 的直接子节点读取 `canvas` 列表。
- 想确认 `Page 1` 的顶层 layer 时，不要只依赖 `get_metadata(nodeId="0:1")` 的长响应；应先在 Figma `Layers` 面板确认顶层 layer 名称，再把结果记录到 PRD。
- 想读取某个已知页面原型的结构时，直接对本文记录的 node id 调用 `get_metadata(nodeId="<node-id>")`，例如：
  - `get_metadata(nodeId="8:3029")` 读取 `timer calendar mode`
  - `get_metadata(nodeId="12:2948")` 读取 `timer listview`
  - `get_metadata(nodeId="10:13202")` 读取 `timer timesheet mode`
- 想实现或核对具体视觉与交互时，不能停在 metadata；必须继续调用 `get_design_context(nodeId="<node-id>")` 获取该页面或组件的设计上下文。
- 若需要截图证据或视觉比对，再调用 `get_screenshot(nodeId="<node-id>")`；截图用于校对视觉，不替代本文记录的页面语义与边界定义。
- 若 `get_metadata` 返回被截断、遗漏兄弟层级或难以可靠枚举顶层 layer，则以 Figma `Layers` 面板为顶层索引来源，以本文记录的 node id 为后续 MCP 精确读取入口。

### 按目标页面选择 MCP 入口

- 先按产品边界选 PRD，再按该 PRD 记录的 node id 调 MCP；不要先扫整张 Figma page，再临时猜某个页面应该归谁。
- 需要共享导航壳层时，调用 `left nav`，node `8:2829`。这适用于 tracking 相关页面共用的 workspace switcher、侧边导航、profile/admin 入口和壳层布局。
- 需要 `Timer / Calendar` 时，调用 `timer calendar mode`，node `8:3029`。
- 需要 `Timer / List view` 时，调用 `timer listview`，node `12:2948`。
- 需要 `Timer / Timesheet` 时，调用 `timer timesheet mode`，node `10:13202`。
- 需要 `Project page` 时，调用 `project list`，node `10:20028`。即使后续实现包含详情、成员、任务或模板入口，也先以这个页面骨架为 MCP 入口。
- 需要 `Client page` 时，调用 `client`，node `12:3281`。
- 需要 `Tag page` 或 `Task page` 时，当前没有独立 tracking Figma node；应按本文定义复用 `project page` 的骨架作为 fallback，而不是从 `Page 1` 里另猜一个近似页面。
- 如果你只有用户口头描述，例如“timer 页面”“项目页”“客户页”，先把需求归并到本文的页面族名称，再调用对应 node；不要对 `Page 1` 做全量 metadata 后靠文本搜索替代页面映射。
- 如果本文已经给出 node id，默认直接对该 node 调 `get_metadata` / `get_design_context` / `get_screenshot`；`Page 1` 顶层 layer 清单只用于建立索引，不是默认读取入口。

### Shared App Shell

- 共享应用壳以 Figma `left nav` 节点 `8:2829` 为参考，文件为 `https://www.figma.com/design/IiuYyZAD0bWx9C8BxetnFc/OpenToggl`。
- workspace switcher、左侧导航、profile/admin 入口应跨 `overview`、`timer`、`project`、`client`、`tag` 复用同一壳层，不为每个页面复制一套布局。
- `Track` 分组下的正式一级入口是 `Overview` 与 `Timer`；不要再把 timer 状态做成一个伪导航卡片来替代正式 `Timer` 导航项。

### 上游 URL 与导航归属

- 本册记录的是 tracking 产品面的正式页面语义，但导航激活态、路由归属和 ID 归属必须同时对照上游 Toggl 的真实 URL 形状，不能只按“看起来像 workspace 子路由”做前缀匹配。
- `workspace_id` 与 `organization_id` 必须严格区分；不能因为两个 ID 都出现在左侧壳层里，就把它们混成一套路由规则。
- `overview` 的上游入口是 `https://track.toggl.com/overview`。
- `timer` 页面族的上游入口是 `https://track.toggl.com/timer`。
- `overview` 与 `timer` 都是账号级页面入口，不通过 `workspace_id` 进入；当前 workspace 只作为页面上下文，不是这两个页面 pathname 的组成部分。
- `timer` 的 `calendar`、`list`、`timesheet` 三个 view 在上游 Toggl 中是同一页面内的本地 state 切换，不通过 URL pathname 或 query string 区分；切 view 时地址栏不变化。
- 直接进入 `https://track.toggl.com/timer` 时，默认激活的 view 是 `calendar`；`list` 与 `timesheet` 只是在同一页面内切换主内容投影。
- `reports summary` 的上游路径是 `https://track.toggl.com/reports/{organization_id}/summary?...&wid={workspace_id}`。它属于 reports 产品面，不属于 tracking 自己的页面族，但 shared shell 的导航判断需要识别它同时携带 organization 和 workspace 上下文。
- `approvals` 的上游路径是 `https://track.toggl.com/{workspace_id}/approvals`。
- `projects` 的上游路径是 `https://track.toggl.com/projects/{workspace_id}/list`。
- `clients` 的上游路径是 `https://track.toggl.com/{workspace_id}/clients`。
- `tags` 的上游路径是 `https://track.toggl.com/{workspace_id}/tags`。
- organization 级团队管理的上游路径是 `https://track.toggl.com/organization/{organization_id}/team?filter=&status=active`。这是 organization 页面，不应按 workspace tracking 页面处理。
- organization / workspace settings 入口跨域到 `accounts.toggl.com`；当前已知组织入口形状是 `https://accounts.toggl.com/console/organization/{organization_id}/overview/?returnTo=<track-workspace-settings-url>`，其中 `returnTo` 会回到 `https://track.toggl.com/{workspace_id}/settings/general`。这说明 settings/organization console 不是 tracking 页面族内部的同域子路由。
- 任何 shared shell 或导航高亮实现都必须以“页面归属 + 精确路径形状 + ID 类型”判定当前选中项，不能把 `/overview`、`/timer`、`/reports/{organization_id}/summary`、`/{workspace_id}/approvals`、`/projects/{workspace_id}/list`、`/organization/{organization_id}/team` 误收敛成同一种 workspace 子路径。

### Timer 页面族

- `Timer / Calendar`
  - Figma：`timer calendar mode`，node `8:3029`
  - Screenshot：[toggl-timer-calendar-view-week.png](../../toggl_screenshots/toggl-timer-calendar-view-week.png)
  - 产品含义：这是同一 `timer` 页面在 `calendar` 视图下的周视图，用时间栅格展示 time entries。
  - 实现要求：它与 `list view`、`timesheet` 共享同一页面族、日期范围、筛选条件、running timer/header 状态，只替换主内容区投影，不单独定义另一套页面或数据模型；`calendar` 也是用户直接打开 `timer` 时的默认 landing view。
  - URL 约束：在上游 Toggl 中，`calendar` 不是独立 URL；它是 `https://track.toggl.com/timer` 内部的 view state。
  - 数据边界：页面展示的是当前 workspace 的 time entries；即使底层读取来自 `/me/time_entries`，也必须在进入 `calendar` 投影前按当前 workspace 过滤。
- `Timer / List view`
  - Figma：`timer listview`，node `12:2948`
  - Screenshot：[toggl-timer-list-view-all-dates.png](../../toggl_screenshots/toggl-timer-list-view-all-dates.png)
  - 产品含义：这是 `timer` 页面按日期分组的明细视图，用线性列表展示 time entries。
  - 实现要求：它读取的仍是同一批当前 workspace time entries，不应和 `calendar`、`timesheet` 产生不同过滤语义；创建、编辑、停止 timer 的入口要保持一致。
  - URL 约束：在上游 Toggl 中，`list` 不是独立 URL；它是 `https://track.toggl.com/timer` 内部的 view state。
- `Timer / Timesheet`
  - Figma：`timer timesheet mode`，node `10:13202`
  - Screenshot：[toggl-timer-timesheet-view-week.png](../../toggl_screenshots/toggl-timer-timesheet-view-week.png)
  - 产品含义：这是 `timer` 页面在 `timesheet` 视图下的聚合呈现，按项目和星期维度显示工作时长。
  - 实现要求：它是当前 workspace time entries 的聚合读面，不是单独的事务写模型；复制上周、按日合计、按项目行展示等行为都应建立在同一 tracking 事实之上。
  - URL 约束：在上游 Toggl 中，`timesheet` 不是独立 URL；它是 `https://track.toggl.com/timer` 内部的 view state。

### Project / Client / Tag 页面

- `Project page`
  - Figma：节点名为 `project list`，node `10:20028`
  - Screenshot：[toggl-projects-list.png](../../toggl_screenshots/toggl-projects-list.png)
  - 产品含义：PRD 中按 `project page` 理解，而不是只读列表。它承担项目浏览、过滤、创建、归档/恢复、pin/unpin、成员与任务入口。
  - 实现要求：顶部过滤条、主表格、创建按钮、时间状态/成员/pinned 等列是默认信息架构；详情、成员、任务、模板等流程应从该页面进入或挂接，而不是拆成一组彼此无关的页面。
  - URL 约束：上游 Toggl 入口路径是 `https://track.toggl.com/projects/{workspace_id}/list`，不是 `/{workspace_id}/projects` 这种简单的 workspace 子路径。
- `Client page`
  - Figma：`client`，node `12:3281`
  - Screenshot：当前没有对应截图，先以 Figma 为主参考
  - 产品含义：client 是独立产品对象，不是 project 的附属标签。
  - 实现要求：过滤栏、表格骨架、批量操作和详情入口直接参考 `project page` 结构，只把主实体、列定义和过滤条件替换为 client 语义。
  - URL 约束：上游 Toggl 入口路径是 `https://track.toggl.com/{workspace_id}/clients`。
- `Tag page`
  - Figma：当前没有单列 node
  - Screenshot：当前没有单列截图
  - 产品含义：tag 仍是正式产品对象，但当前页面结构可以直接参考 `project page`。
  - 实现要求：信息架构、过滤条、表格主体、批量编辑与详情入口可沿用 `project page` 的骨架，只替换为 tag 的字段与操作；后续若补独立 Figma node，再细化视觉与交互差异。
  - URL 约束：上游 Toggl 入口路径是 `https://track.toggl.com/{workspace_id}/tags`。

## Web 要求

Web 端必须完整承接 tracking 产品面的正式能力，不允许把本册定义的正式能力保留为 API-only。

Web 端的正式页面与入口包括：

- 时间记录列表与计时器入口
- 创建 / 编辑表单
- 批量编辑与过滤视图
- 项目列表、详情、成员管理、任务管理、模板视图
- timesheets / approvals / expenses 页面
