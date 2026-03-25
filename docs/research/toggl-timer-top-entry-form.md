# Toggl Timer 顶部录入表单研究

> Mission status
> Agent: shared-timer-page-state-and-view-preference
> Status: complete
> Current code differences: No differences. Implementation matches documented behavior: the top composer is shared across calendar/list/timesheet views, running timer shows live elapsed time from `start` time, and running entry edits persist immediately.
> Todo: none
> Fully implemented: yes

> Mission status
> Agent: timer-core-cross-workspace-header-backend-proof-and-traceability
> Status: complete
> Current code differences: No differences. Backend truth proof added via TestCrossWorkspaceRunningTimerEditStop (regressions_test.go) paired with existing browser E2E coverage. The top composer shared header behavior across workspace switch (VAL-TIMER-002, VAL-TIMER-003, VAL-TIMER-005, VAL-CROSS-001, VAL-CROSS-003) is now proven at both backend and browser layers using the same seeded scenario.
> Todo: none
> Fully implemented: yes

本文件研究 Timer 页最上方这一条主录入表单，也就是：

- `Add a description`
- `Add a project`
- `Billable`
- 运行中的 duration
- `Start/Stop time entry`

它是 Toggl 在 `/timer` 页里的主工作入口。

## 1. 产品定义（PRD 视角）

## 1.1 这不是“创建按钮”，而是常驻型工作台表单

顶部这一条不是点击后才打开的 dialog。

它始终固定在 Timer 页顶部，承担的是：

- 开始新的 time entry
- 编辑当前正在进行的 time entry
- 在不离开当前视图的情况下持续修正上下文

所以它的产品定位不是 modal form，而是：

```text
always-on timer composer
```

## 1.2 它会随着 timer 状态切换产品语义

当前样本里正在计时，因此顶部表单展示的是：

- 正在增长的 duration
- `Start/Stop time entry`
- 可直接改 description / project / billable

这说明同一条表单至少覆盖两种状态：

- 未开始时：创建 / 开始
- 已开始时：边记时边修正

它本质上不是一次性提交流，而是：

```text
timer state machine 的主控制面板
```

## 1.3 description 是第一入口

点击 `Add a description` 后，不是进入一个单纯文本框，而会直接弹出增强联想层：

- 当前 workspace
- `Change`
- `PROJECTS`
- 近期/常用候选项

因此 description 在产品上承担两层角色：

- 记录文本描述
- 作为快捷选择入口

## 1.4 project 选择是独立的第二入口

点击 `Add a project` 后，出现独立 project 选择面板，当前样本看到：

- `Change`
- `Search by project, task or client`
- 列表候选项
- `Create a new project`

所以 Toggl 没有把 project 完全藏进 description `@` 语法里，而是保留了主表单级的明确项目入口。

## 1.5 这个表单偏“即时保存”，而不是“填完再提交”

从当前运行态体验和 bundle 逻辑看，Toggl 的主倾向不是：

- 全部填完后点 Save

而是：

- 在 running / automatic 模式下边改边同步
- 在 manual / save 模式下再统一提交

这和 time entry popup 的 `Save` 按钮逻辑不同。

## 2. 技术实现（运行时证据）

## 2.1 主容器是 sticky 的 TimerContainer

当前页面里能看到：

- `bg-primary css-dxpkut-TimerContainer`

并且它在 Calendar / List / Timesheet 三种视图里都存在，说明这条表单是 Timer 页所有视图共享的顶层容器。

## 2.2 description 使用增强 autocomplete popdown

点击顶部 description 后，当前聚焦元素是：

- `INPUT`
- class: `css-1vbhhbb-Input-InputCss-FluidTextInputStyled`
- 区域容器：`css-yxzysu-Container`

弹出的联想层类名：

```text
css-1453oob-PopdownRoot-raised50-floating-PopdownStyled-PopdownCss-EnhancedTimeEntryAutocompletePopdown
```

当前样本里这个联想层直接展示：

- workspace 名称
- `Change`
- `PROJECTS`
- 项目建议列表

并且它是：

- `position: absolute`
- 独立 popdown
- 挂在顶部表单下方

## 2.3 project 选择器是单独的 ProjectsPopdown

点击 `Add a project` 后，聚焦元素变成：

- placeholder: `Search by project, task or client`

相关容器链路：

- `css-1rx9kko-Input-input`
- `css-1dxjdwy-Root-ProjectsPopdownContent`
- `css-1smn9i5-PopdownRoot-raised50-floating`

关键特征：

- `position: absolute`
- `z-index: 201`
- 带搜索框
- 可切 workspace
- 可创建新项目

也就是说顶部 project 选择器不是简单下拉，而是一个功能完整的 project/task/client 搜索 popdown。

## 2.4 视图无关，但数据上下文共享

无论当前是：

- Calendar
- List view
- Timesheet

顶部表单都保持同一套：

- description
- project
- billable
- duration
- start/stop

所以它不是某个视图的子组件，而是 Timer 页共享 composer。

## 2.5 主表单是 action-driven state machine

bundle 中可直接看到这批主动作：

- `TIMER_DESCRIPTION_CHANGE`
- `TIMER_DESCRIPTION_SUBMIT`
- `TIMER_PROJECT_TASK_CHANGE`
- `TIMER_BILLABLE_CHANGE`
- `TIMER_START_CHANGE`
- `TIMER_STOP_CHANGE`
- `TIMER_START_STOP_CHANGE`
- `TIMER_START_TIME_ENTRY`
- `TIMER_CONTINUE_TIME_ENTRY`
- `TIMER_STOP_TIME_ENTRY`
- `TIMER_SAVE_TIME_ENTRY`
- `TIMER_ADD_MANUALLY`

这说明顶部表单不是一个简单组件 state，而是挂在一条完整 timer workflow 上。

## 2.6 running 状态下，字段变更会直接更新当前 time entry

bundle 中有一条非常关键的 watcher：

```text
["TIMER_DESCRIPTION_CHANGE",
 "TIMER_AUTOCOMPLETE",
 "TIMER_BILLABLE_CHANGE",
 "TIMER_START_CHANGE",
 "TIMER_STOP_CHANGE",
 "TIMER_START_STOP_CHANGE",
 "TIMER_PROJECT_TASK_CHANGE"]
  -> if current entry is running => timeEntryUpdate(e)
```

这意味着：

- 当当前 entry 处于 running 状态时
- 改 description / project / billable / start-stop
- 不需要额外 Save
- 会直接走 `timeEntryUpdate`

这正是顶部表单“即时保存”体验的核心。

## 2.7 非 running 状态下，会进入 manual / save 分支

同一段 saga 里还可以看到：

- 模式判断：`automatic / manual / save`
- `TIMER_DESCRIPTION_SUBMIT`
  - 在 `manual` 模式时 -> `TIMER_ADD_MANUALLY`
  - 在 `save` 模式时 -> `TIMER_SAVE_TIME_ENTRY`
  - 否则 running entry 直接 update 或 start

因此顶部表单技术上不是单模式，而是：

```text
automatic / manual / save
```

三态驱动的 timer composer。

## 2.8 Start / Stop 走的是不同命令

bundle 中：

- `TIMER_START_TIME_ENTRY`
  - -> `pa.timeEntryAdd(a)`
- `TIMER_STOP_TIME_ENTRY`
  - -> `pa.timeEntryUpdate(e, { description, stop, duration }, { stop: true })`

所以开始与停止不是同一个 API 行为：

- start 是 create
- stop 是 update existing entry

## 3. 对复刻最重要的启发

如果要复刻 Toggl 的顶部录入体验，最应该复制的是这些决策：

- 顶部录入条始终常驻，不做成弹窗
- description 与 project 各自都有增强 popdown
- running 状态下字段修改立即持久化
- manual / save / automatic 是显式模式，不要混成一个模糊流程
- start 与 stop 走不同命令路径
- 这条 composer 要跨 Calendar / List / Timesheet 共享

## 4. 当前最准确的技术判断

Toggl 顶部录入表单最准确的定义应该是：

```text
一个跨 Timer 全视图共享的 sticky composer，
由 timer action/state machine 驱动，
在 running 状态下偏即时同步，
在 manual/save 状态下偏显式提交。
```
