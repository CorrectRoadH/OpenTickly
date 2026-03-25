# Toggl Timer 视图家族研究：Calendar / List / Timesheet

本文件研究 Timer 页顶部这组三选一视图：

- `Calendar`
- `List view`
- `Timesheet`

重点回答两个问题：

1. 从产品上，这三种视图分别承担什么任务？
2. 从技术上，这三种视图如何切换、如何持久化、是否共用同一批数据？

## 1. 产品定义（PRD 视角）

## 1.1 这不是三个不同页面，而是一个 Timer 工作台下的三种工作模式

三种视图切换时，URL 都保持：

```text
https://track.toggl.com/timer
```

所以它们的产品语义不是：

- 去不同页面

而是：

- 在同一个 Timer 工作台里切换不同工作模式

## 1.2 Calendar：时间轴编辑模式

Calendar 的目标最明确：

- 在时间轴上看当天/当周分布
- 拖拽移动与缩放时间块
- 通过空间位置理解“什么时候做了什么”

这是一种偏：

```text
时序 / 空间 / 日程感知
```

的模式。

## 1.3 List view：逐条编辑与回顾模式

切到 List view 后，当前样本里直接出现：

- `All dates`
- `TODAY TOTAL`
- 按天分组标题（如 `Yesterday`）
- 每条 entry 的行式布局
- `Load more`

这说明它的产品目标不是时间轴排布，而是：

- 线性回看历史 entry
- 批量连续浏览
- 快速逐条改 description / project / billable / more actions

它更像：

```text
feed / activity list / entry ledger
```

## 1.4 Timesheet：按项目 × 日期汇总填报模式

切到 Timesheet 后，界面立刻变成表格：

- 列头：`MON ... SUN TOTAL`
- 行头：项目
- 行尾与表尾：周合计
- `Add new row`
- `Copy last week`

这说明它的产品目标不再是“逐条时间 entry”，而是：

- 按项目聚合
- 按天填小时
- 更接近工时报表/填表体验

也就是说它不是 entry 视角，而是：

```text
project-by-day matrix
```

## 1.5 三种视图各自适合的任务

可以把三者理解成三种用户心智：

- `Calendar`：我想看和改时间分布
- `List view`：我想逐条检查和补录
- `Timesheet`：我想按项目/天数做工时填报

这比“只是不同展示方式”要更强，因为它们服务的是不同工作流。

## 2. 技术实现（运行时证据）

## 2.1 视图切换不改 URL，而是改本地状态 + 用户偏好

本次 live 直接抓到：

### 切到 List view

```text
POST /api/v9/me/preferences/web
{"TimerView":"list","CalendarView":"calendar"}
```

### 切到 Timesheet

```text
POST /api/v9/me/preferences/web
{"TimerView":"timesheet","CalendarView":"calendar"}
```

这说明：

- 当前选中的 Timer 主视图会写进用户 web preferences
- 切换结果是持久化的，不只是临时 UI state

## 2.2 Toggl 实际上是两层视图模型

bundle 中有明确 saga：

```text
timer/CHANGE_VIEW
  -> preferencesChange({ TimerView: e.to, CalendarView: "calendar" })
```

这说明 Timer 页至少有两层视图状态：

- `TimerView`
  - `calendar`
  - `list`
  - `timesheet`
- `CalendarView`
  - calendar 模式内部的子视图（如 week/day/work-week）

因此：

- 顶部单选控制的是 Timer 一级模式
- Calendar 自己还有二级子视图

## 2.3 Calendar / List / Timesheet 不是三套完全独立数据源

从切换过程看：

- 切到 List view 时，没有重新发新的 time entries 主数据请求
- 主要出现的是 preferences 写入
- 说明它更像是前端对已有 timer 数据做另一种重组渲染

而 Timesheet 除了 preferences 写入外，还额外发了：

```text
POST /api/v9/workspaces/6296488/projects/task_count
{"project_ids":[null]}
```

所以 Timesheet 比 List 多依赖一层项目/任务相关辅助数据。

## 2.4 Calendar 是时间网格，List 是线性块，Timesheet 是真实表格

运行时直接验证：

### Calendar

- `.rbc-calendar` / `.rbc-time-view` / `.rbc-day-slot` 存在
- `rbcCount > 0`

### List view

- `rbcCount = 0`
- `tableCount = 0`
- 有 day section，如 `Yesterday`
- 有 `Load more`

### Timesheet

- `rbcCount = 0`
- `tableCount = 1`
- sticky `thead` / `tfoot`

这说明三者不是只换皮肤，而是换了不同布局骨架：

- Calendar -> time-grid
- List -> sectioned vertical list
- Timesheet -> tabular matrix

## 2.5 List view 会改顶部 period 控件语义

切到 List view 后，当前样本里看到：

- 左右 period 按钮变 disabled
- 中间从 `This week·W13` 变成 `All dates`
- 新增 `TODAY TOTAL`

这说明 List view 不再把“当前周导航”作为主上下文，而是转成：

- 跨日期滚动列表
- 日级分组 + 累计汇总

## 2.6 Timesheet 会保留周语义

切到 Timesheet 后，顶部仍是：

- `This week·W13`
- `WEEK TOTAL`

而主表格列直接对应：

- `MON ... SUN TOTAL`

说明 Timesheet 仍然是强周粒度模式，不像 List view 那样切到“全部日期流”。

## 2.7 Keyboard shortcut 也把视图切换当一等能力

bundle 里快捷键文案明确写着：

```text
Cycle list, calendar and calendar day views
shortcut: v
```

这说明：

- 视图切换不是边缘功能
- 它被设计成高频可切换工作模式

## 3. 对复刻最重要的启发

如果要复刻 Toggl 的 Timer 视图家族，关键不是做三个 Tab，而是复制这些结构决策：

- 三种视图都挂在同一个 `/timer` 工作台，不跳转页面
- 主视图选择要持久化到用户偏好
- Calendar / List / Timesheet 用不同布局骨架，而不是同一组件换 CSS
- List 改变 period 语义，Timesheet 保持周语义
- Calendar 内部还要保留二级子视图状态

## 4. 当前最准确的技术判断

Toggl 的 Timer 页不是“一个页面 + 三个外观”，而是：

```text
一个持久化的多模式工作台：
TimerView 决定一级工作模式，
CalendarView 决定 calendar 内部子模式，
三种主视图共享 Timer 上下文，但使用不同渲染骨架与不同汇总语义。
```
