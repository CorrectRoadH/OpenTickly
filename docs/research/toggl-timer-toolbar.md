# Toggl Timer 顶部工具条研究

本文件专门研究 Timer 页面这条顶部控制条，也就是紧贴日历上方、包含：

- 当前 period
- `WEEK TOTAL`
- `Week view`
- `Calendar / List view / Timesheet`
- 缩放与其他辅助按钮

对应当前主页面：

```text
https://track.toggl.com/timer
```

## 1. 产品定义（PRD 视角）

## 1.1 这不是普通页头，而是 Timer 工作台的主视图控制条

它不只是显示标题，而是直接承担三类控制：

- 时间范围导航
- 当前范围汇总反馈
- 视图模式切换

所以它的产品角色更接近：

```text
timer workbench toolbar
```

而不是静态 header。

## 1.2 左侧 period 区域定义“当前正在看哪一段时间”

当前样本在周视图里显示：

- `Select previous period`
- `This week · W13`
- `Select following period`

切到日视图后则变成：

- `Today · Wed`

这说明中间标签不是固定文案，而是：

- 跟随当前 calendar 粒度变化
- 充当当前时间上下文标签

## 1.3 `WEEK TOTAL` 是工作台级摘要，不是单个视图标题

当前样本中，无论周视图还是日视图，顶部都持续显示：

- `WEEK TOTAL`
- 对应累计时长，例如 `11:45:43`

即使主画布切到 `Day view`，这个汇总仍保持“周级”语义。  
所以它表达的是：

- 当前工作周累计 tracked time

而不是“当前面板的小计”。

## 1.4 `Week view` 下拉控制的是 Calendar 模式内部的子形态

当前 live 直接看到下拉选项：

- `Week view`
- `5 days view`
- `Day view`

这说明 Calendar 不是单一展示，而是还有二级模式。

产品上可以理解为：

- `Week view`：一周七天
- `5 days view`：工作周
- `Day view`：单日聚焦

## 1.5 `Calendar / List view / Timesheet` 是一级工作模式切换

右侧单选组始终显示：

- `Calendar`
- `List view`
- `Timesheet`

它们不是小切换项，而是整个 Timer 页的一级工作模式：

- `Calendar`：时间轴/排布
- `List view`：线性逐条回顾
- `Timesheet`：按项目 × 日期填报

## 1.6 缩放与辅助按钮属于当前 Calendar 画布控制

在 Calendar 画布标题行还能直接看到：

- `Decrease zoom`
- `Increase zoom`

说明顶部控制条除了“切模式”，还负责调当前时域画布的密度。

## 2. 技术实现（运行时证据）

## 2.1 顶部工具条和 Timer 主画布是同一路由内的共享控制层

当前 URL 始终是：

```text
https://track.toggl.com/timer
```

无论切换：

- `Week view / 5 days view / Day view`
- `Calendar / List view / Timesheet`

都不离开这个路由。

因此工具条控制的是：

- Timer 内部状态
- 用户偏好
- 当前画布布局

而不是页面跳转。

## 2.2 一级模式切换依然走 `TimerView`

此前已验证：

### Calendar / List / Timesheet

```text
POST /api/v9/me/preferences/web
```

例如：

```json
{"TimerView":"list","CalendarView":"calendar"}
```

和：

```json
{"TimerView":"timesheet","CalendarView":"calendar"}
```

所以顶部单选组控制的仍是 Timer 一级模式。

## 2.3 Calendar 二级下拉不是单一字段，而是至少拆成两层 preference

本次针对 `Week view / 5 days view / Day view` 抓到了更细的行为：

### 从 `Week view` 切到 `5 days view`

```json
{"show_weekend_on_timer_page":false}
```

### 从 `5 days view` 切回 `Week view`

```json
{"show_weekend_on_timer_page":true}
```

说明 `Week view` 与 `5 days view` 的差异，至少部分是通过：

```text
show_weekend_on_timer_page
```

来控制是否显示周末列。

## 2.4 `Day view` 会直接改 `TimerView`

切到 `Day view` 时，本次直接抓到：

```json
{"TimerView":"calendar-day","CalendarView":"calendar"}
```

同时又伴随：

```json
{"show_weekend_on_timer_page":false}
```

而从 `Day view` 回到 `Week view` 时，又抓到：

```json
{"TimerView":"calendar","CalendarView":"calendar"}
```

以及：

```json
{"show_weekend_on_timer_page":true}
```

这说明顶部下拉并不是只改一个局部 UI state，而是会组合写入：

- `TimerView`
- `CalendarView`
- `show_weekend_on_timer_page`

其中：

- `Day view` 已经升级成独立 `TimerView = calendar-day`
- `Week / 5 days` 更像 `calendar` 模式下的周末显隐变体

## 2.5 工具条文案会随当前子视图变化

运行时直接看到：

### Week view

- `This week · W13`
- 七列日期头：`23 MON ... 29 SUN`

### Day view

- `Today · Wed`
- 单列日期头：`25 WEDNESDAY`

因此 period 标签与画布结构是联动的，不是独立显示层。

## 2.6 `WEEK TOTAL` 始终锚定周级聚合

即使切到 `Day view`，顶部仍显示：

- `WEEK TOTAL`
- 周累计时长

这说明该指标的数据来源不是“当前可见列求和”，而是：

- 当前周范围汇总
- 独立于当前 day/week 画布密度

## 2.7 工具条右侧还有两个未命名辅助按钮

运行时 DOM 中，`Calendar / List view / Timesheet` 后面还存在两个无文本按钮。  
从 class 命名可以看出：

- 一个是 `SettingsButton`
- 一个是 `SidebarButton`

虽然本轮未继续执行它们的交互流，但可以确认：

- 顶部条不仅控制视图
- 也承担当前 Calendar 画布的配置/边栏入口

## 2.8 缩放按钮属于 Calendar-only 密度控制

在当前 Calendar 模式下，DOM 里直接可见：

- `title="Decrease zoom"`
- `title="Increase zoom"`

并且它们紧贴日期表头区域，说明它们不是全局站点控件，而是针对当前时间网格的显示密度控制。

## 3. 当前结论

Timer 顶部这条条带，本质上是 Toggl Timer 的主控制面板：

- 左边管“看哪段时间”
- 中间给“当前周累计”
- 右边管“用哪种时间工作模式”

技术上它并不是单状态切换，而是组合驱动：

- `TimerView`
- `CalendarView`
- `show_weekend_on_timer_page`

其中最重要的新发现是：

- `Day view` 会把 `TimerView` 切到 `calendar-day`
- `Week view / 5 days view` 通过 `show_weekend_on_timer_page` 控制是否展示周末
