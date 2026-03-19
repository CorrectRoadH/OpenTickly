# 时间追踪

## Goal

这一册定义 time entry、running timer、projects/clients/tasks/tags、timesheets/approvals/expenses 和 calendar integrations 的用户可见行为。

## 范围

本文件定义：

- Time Entries
- running timer
- Projects / Clients / Tasks / Tags
- timesheets / approvals / expenses
- favorites / goals / reminders / timeline
- calendar integrations

## Product Rules

- tracking 是日常使用最频繁的产品面，API 和 Web 必须共享同一套公开行为。
- time entry、project、task、tag、billable、rate 之间的关系必须在创建、编辑、停止、批量更新和报表读取时保持同一解释。
- running timer 不是 UI 特性，而是正式产品状态。
- favorites、goals、reminders、timeline 即使使用频率较低，也属于正式产品面，不能在首版中被静默删掉。

## Time Entries

- 时间记录对象需要完整承载 `workspace_id`、`user_id`、`project_id`、`task_id`、`client_id`、`description`、`billable`、`start`、`stop`、`duration`、`created_with`、`tags` 等兼容语义。
- 必须完整支持创建、更新、删除、单条读取、批量读取、批量更新、按时间范围/用户/项目/任务/标签/描述过滤、since 增量同步、停止运行中时间记录等能力。
- running timer 必须作为兼容产品语义单独实现，包括开始、停止、冲突处理、持续时间与开始/结束时间的关系、运行中状态读取。
- 时间语义必须兼容 RFC3339 风格输入输出、UTC 存储、用户时区展示、跨日与跨时区行为，并为报表口径提供一致事实来源。

## Projects / Clients / Tasks / Tags

- 项目对象必须承载 `client_id`、`name`、`active`、`billable`、`private`、`color`、`currency`、`estimated_seconds`、`actual_seconds`、`fixed_fee`、`rate`、`pinned` 等兼容语义。
- 必须完整支持创建、查看、更新、删除、归档/恢复、激活/停用、批量修改、模板、pin/unpin、统计与 periods 等能力。
- `billable`、`private`、`rate`、`fixed_fee`、`currency`、`estimated_seconds` 等属性必须对时间记录默认行为、报表和盈利分析产生兼容影响。
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

## Calendar Integrations

- calendar integrations 必须被定义为正式产品能力，而不是“有个连接器就算完成”。
- 当前默认原则是优先对齐 Toggl 的公开同步行为；在证据不足时，采用保守且可解释的默认规则：
  - 同步方向与冲突策略必须固定
  - 断开 calendar 连接不得删除已同步产生的历史 time entries
  - calendar event 与 time entry 的关联断开后，历史业务事实仍保留
- 当前默认同步模型为“calendar -> OpenToggl 单向导入优先”；除非公开定义明确证明存在对外承诺的双向写回，否则不默认把 OpenToggl 修改回写到外部 calendar。
- 当前默认冲突规则为“OpenToggl 内已人工修改的 time entry 优先于后续 calendar 覆写”。

## Edge Cases

- 同一用户在同一 workspace 下默认不能维持多个 running timer；发生冲突时，必须有固定处理规则，而不是由不同入口各自决定。
- time entry 的 `start/stop/duration` 之间出现不自洽输入时，必须返回固定错误，而不是在不同入口做不同自动修正。
- archived project、停用成员、断开 calendar connection 等状态变化，不得静默抹掉历史 time entries。
- rate、billable、currency 这类会影响 reports 和 billing 结果的字段，不得在 tracking 页面和报表页面出现不同解释。

## Open Questions

- running timer 并发冲突的精确公开行为，仍需继续对照 Toggl 公开资料确认。
- favorites、goals、reminders、timeline 的低频字段和边界行为，仍需继续从公开资料补齐。

## Web 要求

Web 端至少提供：

- 时间记录列表与计时器入口
- 创建 / 编辑表单
- 批量编辑与过滤视图
- 项目列表、详情、成员管理、任务管理、模板视图
- timesheets / approvals / expenses 页面
- calendar integrations 设置与状态入口
