# Toggl Timer Time Entry Popup 二级日期弹层研究

本文件只研究一个细节：

> 在 time entry popup 里点击时间字段旁的日历按钮后，二级日期弹层如何定位、如何影响页面高度，以及页面滚动时它怎么处理。

## 1. 产品定义（PRD 视角）

## 1.1 这不是独立 modal

点击时间字段旁的日历按钮后，Toggl 不会打开新的阻塞式 modal。

它打开的是：

- 依附在 time entry popup 内部的二级日期选择弹层
- 作用范围只限当前 time entry 编辑流
- 不会把用户带离当前 Calendar 上下文

所以产品语义更接近：

```text
popup 内再展开一个 anchored sub-popdown
```

而不是“打开一个新的日期编辑页面”。

## 1.2 二级弹层会向下扩展，而不是重排主 popup 高度

实际观察到的行为是：

- 主 time entry popup 仍然保持原本的小尺寸
- 日期面板直接从时间字段下面向下展开
- 展开后页面整体变长，可以继续向下滚动

这说明产品选择的是：

- 保持主编辑 popup 的稳定高度
- 把大尺寸日期面板当作附着的扩展层
- 允许用户通过页面滚动去看完整日期面板

而不是：

- 把主 popup 重新拉高
- 或把日期面板做成内部滚动区

## 1.3 滚动是页面级滚动，不是 popup 内滚动

展开日期面板后，实际产生变化的是页面滚动范围，而不是 popup 内部出现滚动条。

也就是：

- 页面继续使用 window/body 滚动
- popup 内容区本身不变成独立 scroll container
- 用户向上或向下滚动时，看到的是整个 anchored popup 跟着页面一起移动

这对复刻很重要，因为它会直接影响：

- 视觉稳定性
- 鼠标命中区域
- sticky 周头与 popup 的相对关系

## 1.4 当前样本里只有一个可见日期按钮

本次实际观察到：

- `7:15 PM` 字段右侧有日历按钮
- 打开日期面板后，下方并没有再暴露第二个同级按钮

也就是说当前实现不是“上下两个时间字段都同时露出一个独立日期按钮”的布局，而更像：

- 先针对当前被操作的时间字段展开一个日期子层
- 子层展开后覆盖并吞掉下方可用空间

## 2. 技术实现（运行时证据）

## 2.1 主 popup 外层保持固定小尺寸

运行时测到：

- `scrollY: 1205`
- `bodyScrollHeight: 2072`
- 主 popup wrapper:
  - `class: css-15w5i4j-ReactPopperWrapper`
  - `position: absolute`
  - `z-index: 400`
  - `height: 192px`
- 主 popup:
  - `class: css-v6dxq6-Popup-raised50-floating-TimeEntryContextPopup`
  - `height: 192px`

结论：

- 主 popup 外层高度没有随日期面板一起变高
- popup 仍然按原来的小浮层尺寸定位

## 2.2 真正变高的是内容流与页面总高度

同时测到：

- popup content `clientHeight: 166`
- popup content `scrollHeight: 534`
- `overflow: visible`
- `overflowY: visible`

这说明：

- 内容实际高度已经远超主 popup 可见框
- 但没有被裁掉，也没有转成内部滚动
- 而是通过 `overflow: visible` 直接把子层泄露到外面

所以页面能变长，不是因为主 popup 被重排，而是因为：

```text
主 popup 高度不变
+ 内容允许外溢
+ 外溢内容参与页面整体可滚动区域
```

## 2.3 二级日期面板是单独的 absolute popdown

日期面板祖先链路里可以看到：

- `css-1f0wh84-DurationField`
- `css-1ta4o45-PopdownRoot-raised50-floating`
- `css-39c9pz-CalendarPickerRoot`

其中关键一层：

```text
css-1ta4o45-PopdownRoot-raised50-floating
position: absolute
overflow: visible
```

这说明日期选择器不是普通块级内容，而是：

- 在时间字段附近生成的二级浮层
- 浮层本身 absolute 定位
- 但仍然留在 popup 内容树下面

## 2.4 二级日期面板不是 fixed 跟视口走

滚动实验结果：

- 当 `scrollY` 从 `965` 变化到更靠上时
- 主 popup `top` 从 `320` 变成 `560`
- 日期面板 `top` 也跟着一起变化

这说明它不是 `position: fixed` 盯住视口。

它的行为更像：

- popup 与日期子层都附着在页面坐标系里
- 页面滚动时，它们一起相对视口移动

换句话说：

```text
定位基准更接近 document flow / absolute page coordinates，
不是 viewport-fixed overlay。
```

## 2.5 页面高度会在展开后增长

实际观测：

- 未展开二级日期面板时：`bodyHeight: 1829`
- 展开后二级日期面板时：`bodyHeight: 2072`

这就是为什么用户会感觉：

- 点开日历后页面“变长了”
- 还能继续往下滚

## 2.6 日期面板本体

当前日期面板类名：

```text
css-39c9pz-CalendarPickerRoot
```

内部是典型 `DayPicker` 体系：

- `DayPicker`
- `DayPicker_transitionContainer`
- `CalendarMonthGrid`
- `CalendarMonth`
- `CalendarDay`

所以日历面板本身并不是自画网格，而是基于现成日期选择器封装。

## 3. 对复刻最重要的实现结论

如果要复刻 Toggl 这里的体验，最核心不是“像一个日期选择器”，而是下面这些结构决策：

- 主 time entry popup 维持小尺寸，不因子层重排
- 日期面板作为子 popdown 从时间字段下方展开
- 子层使用 `overflow: visible`，不是内部滚动
- 展开后增加页面总高度，允许继续滚动
- 滚动时主 popup 与子层一起移动，不做 fixed 锁视口

## 4. 当前最准确的技术判断

这个二级日期弹层最准确的定义应该是：

```text
一个挂在 DurationField 附近的 absolute 子 popdown，
通过 overflow visible 从主 TimeEntryContextPopup 中外溢出来，
并把额外高度转移给页面整体滚动，而不是转给 popup 内部滚动。
```
