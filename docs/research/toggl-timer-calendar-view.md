# Toggl Timer Calendar View 研究

本文件只研究 `Timer` 页中的 `Calendar view`。

## 1. 实现结论

Toggl 的 Calendar view 不是手写时间网格，而是：

```text
React + react-big-calendar + drag-and-drop addon + 自定义样式覆盖
```

最直接的运行时证据：

- DOM 中大量出现 `.rbc-*` 类
- 包括 `.rbc-calendar`、`.rbc-time-view`、`.rbc-day-slot`、`.rbc-current-time-indicator`
- 同时出现 `.rbc-addons-dnd-*`
- 页面会单独加载 `calendar-view.5096fa2fb1276fa3.js`

说明它把 calendar view 单独拆成了懒加载 chunk。

## 2. 视图结构

当前周视图运行时可观察到：

- `daySlots: 7`
- `timeColumns: 8`（包含时间 gutter）
- `timeslotGroups: 192`
- 有当前时间指示线 `rbc-current-time-indicator`
- 启用了 DnD 容器 `rbc-addons-dnd`

这说明它采用的是典型 time-grid 结构，而不是 table 式周历。

## 3. 日历核心配置

从 `calendar-view` chunk 可直接抓到这些配置项：

- `onSelectSlot`
- `onSelectEvent`
- `onEventDrop`
- `onEventResize`
- `draggableAccessor`
- `resizableAccessor`
- `eventPropGetter`
- `views: [WORK_WEEK, WEEK, DAY]`
- `step`
- `timeslots`
- `showMultiDayTimes: true`
- `toolbar: false`

这意味着：

- 点空白时间段可以创建/选择时间范围
- 点时间块可以进入条目交互
- 时间块支持拖动移动
- 时间块支持 resize 调整开始/结束时间
- 可拖拽/可调整不是全局固定，而是由 accessor 决定
- 顶部工具栏不是 react-big-calendar 默认 toolbar，而是自定义了一套 Timer 页头

## 4. CSS 覆盖重点

Toggl 把 `react-big-calendar` 的默认外观几乎全改掉了。

### 4.1 顶部日期栏吸顶

实际规则：

```css
.rbc-time-header {
  position: sticky;
  top: var(--timer-dashboard-area-height);
  z-index: 9;
}
```

这会让上方日期列在页面滚动时固定住，并和 Timer 页头协调。

### 4.2 all-day 区域被禁用

```css
.rbc-allday-cell {
  display: none;
}
```

说明 Toggl 不把 Calendar view 当“通用日历”，而是专注带时间轴的 time entry。

### 4.3 网格被产品化

抓到的关键规则包括：

```css
.rbc-timeslot-group {
  min-width: 48px;
  min-height: 60px;
}

.rbc-time-content {
  overflow: visible;
}
```

特点：

- 时间格高度固定，视觉密度稳定
- `overflow: visible` 允许时间块、selection、resize handle 超出格子自然显示

### 4.4 当前时间线更强调

```css
.rbc-current-time-indicator {
  height: 3px;
  border-radius: 2px;
}

.rbc-current-time-indicator::before {
  width: 13px;
  height: 13px;
  border-radius: 50%;
}
```

也就是“高亮线 + 左端圆点”，比默认 RBC 更强。

## 5. Calendar view 的产品逻辑特点

### 5.1 支持 drill-down

calendar 配置里存在 `onDrillDown`，同时日期头在 DOM 中是 button。

这说明点某一天并不只是高亮，大概率会进入更细粒度视图（例如 day view）。

### 5.2 周/工作周/日视图是分别定制的

chunk 中存在：

- `weekViewCss`
- `workWeekViewCss`
- `dayViewCss`

说明不是一个样式硬套所有模式，而是按视图分别调布局。

### 5.3 有旧数据范围限制

chunk 里直接存在组件：

```text
CalendarOldTimeEntriesDisclaimer
```

文案明确写到：

```text
Our Calendar view works best for time entries from less than 3 months ago.
```

这说明 Calendar view 不是历史数据总入口；超过范围会引导去 Reports。

## 6. 为什么它看起来顺手

Calendar view 的顺手感主要来自下面几个点：

- 顶部日期栏 sticky，不会丢失上下文
- 当前时间线高对比度，定位快
- 默认 toolbar 被移除，保留更贴近 Timer 业务的控制条
- 视图切换、日期范围、总时长都放在同一工作区
- 拖拽和 resize 是一等能力，不是附加功能

## 7. 对 OpenToggl 的启发

如果要靠近 Toggl 的这套 Calendar view，关键不是“像不像”，而是要复制这些结构决策：

- 用成熟 time-grid 库做骨架
- 顶部控制条自己做，不依赖库默认 toolbar
- 强约束 all-day / 通用日历能力，只保留 time entry 真需求
- 让 time block 拖动、缩放、当前时间线成为一等能力
- 把历史数据和当前工作周的交互模型分开
