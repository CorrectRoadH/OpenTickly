# Toggl Timer Time Entry Block 研究

> Mission status
> Agent: calendar-direct-manipulation
> Status: partial
> Current code differences: Calendar blocks now expose anchored selection plus explicit move/resize affordance controls for stopped entries and suppress invalid end-resize affordances for running entries, but the live surface still lacks true drag handles and richer locked-entry state styling from the source capture.
> Todo: replace button-based manipulation affordances with real drag/resize gestures and add locked-entry visual treatment once the underlying constraints model is available on the web surface.
> Fully implemented: no

本文件聚焦 Calendar view 里的 time entry block，而不是整个日历容器。

## 1. 渲染基础

time entry block 运行在 `react-big-calendar` 的事件模型之上，DOM 使用：

- `.rbc-event`
- `.rbc-event-content`
- `.rbc-event-label`
- `.rbc-events-container`

因此它本质上是 calendar event，只是被 Toggl 重新解释为 time entry block。

## 2. 交互能力

从 `calendar-view` chunk 可直接确认，这个 block 至少具备下面几类交互：

- `onSelectEvent`
- `onEventDrop`
- `onEventResize`
- `onContextMenu`
- `draggableAccessor`
- `resizableAccessor`

结论：

### 2.1 点击

点击 block 会走 `onSelectEvent`，说明它不是纯展示块，而是编辑/详情入口。

### 2.2 拖动移动

calendar 配置启用了：

```text
resizable: true
onEventDrop
draggableAccessor
```

说明 time entry block 可以在时间轴上整体移动，但是否允许拖动由每条 entry 的状态决定。

### 2.3 拉伸调整时长

同样配置里还有：

```text
onEventResize
resizableAccessor
```

说明开始时间/结束时间可以通过拖拽边缘调整。

### 2.4 右键/上下文菜单

运行时代码里能看到：

```text
onContextMenu: e => { ... open({ x: e.clientX, y: e.clientY }, ...) }
```

这说明 block 支持基于鼠标位置打开上下文 popup，而不是只能靠左键点击进入详情。

## 3. 外观规则

抓到的关键样式：

```css
.rbc-day-slot .rbc-event {
  font-family: Inter, Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 500;
  border: none;
  color: rgb(250, 250, 250);
  background-color: rgb(27, 27, 27);
  border-radius: 0;
  padding: 1px 1px 0;
  overflow: visible;
  animation: fadeIn 0.15s linear;
}
```

几个重点：

- 默认不是彩色大卡片，而是深色实体块
- project color 更像语义强调，不是整个卡片底色直接铺满
- `overflow: visible` 方便显示 tooltip、状态点、handle
- 新渲染块有一个很轻的 `fadeIn`

## 4. 特殊状态

从运行时代码和样式可确认 block 至少有这些状态：

- `isRunning`
- `isLocked`
- `isUnsynced`
- `billable`
- `sharedWith`
- `invitation`
- `hasProject`

还可以看到字段参与渲染：

- `description`
- `projectName`
- `projectColor`
- `taskName`
- `clientName`
- `tags`

所以它并不是“只显示标题和时长”的极简块，而是一个压缩型的业务对象视图。

## 5. running entry 的特别处理

对运行中的条目，chunk 里有两个很关键的信号：

### 5.1 结束时间不是固定值

calendar 配置里的 `endAccessor` 会特殊处理 running entry：

```text
if (e.isRunning) return startOf("minute").toDate()
```

也就是 running block 的右边界/底边界会随着“当前时间”实时推进。

### 5.2 running entry 的 resize handle 被裁剪

样式中有：

```css
.rbc-event-running .rbc-addons-dnd-resize-ns-anchor:last-of-type {
  display: none;
}
```

说明运行中的时间块不会完整暴露正常的结束端拖拽控制，因为它的结束时间仍在流动。

## 6. 跨日与锁定

样式里还存在：

```css
&.rbc-event-continues-earlier {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
&.rbc-event-continues-later {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
&.rbc-event-locked {
  cursor: default;
}
```

说明：

- 跨日 entry 会用截断圆角表达“还在前一天/后一天继续”
- 锁定 entry 不再给出可编辑游标反馈

## 7. resize 的视觉信号

DnD addon 被深度定制过：

```css
.rbc-addons-dnd-resize-ns-anchor {
  z-index: 1;
  cursor: row-resize;
}

.rbc-addons-dnd-resize-ns-anchor .rbc-addons-dnd-resize-ns-icon {
  width: 8px;
  margin: 2px auto;
}
```

而默认 addon 样式里还能看到：

```css
.rbc-addons-dnd .rbc-event:hover .rbc-addons-dnd-resize-ns-icon {
  display: block;
}
```

这意味着 handle 平时尽量隐身，hover 时再暴露，避免界面一直很吵。

## 8. tooltip / 辅助动作

运行时代码里出现了：

- `continueTooltip`
- tooltip 样式
- 与 running / unsynced / unmetConstraints 相关的小状态组件

这说明 time entry block 不是“点开才看细节”，而是在块本身上就承载了一部分轻量反馈和快捷操作。

## 9. 研究限制

当前账号在观察时，Calendar 上没有稳定可见的普通历史 block，所以部分结论来自：

- 运行时已加载 bundle
- 注入样式
- 当前 DOM 结构

其中关于 `onSelectEvent`、`onEventDrop`、`onEventResize`、`onContextMenu`、`running / locked / continues-*` 等判断，证据是比较强的；但某些极端状态的具体文案和布局还需要在真实 entry 更丰富时继续补采。
