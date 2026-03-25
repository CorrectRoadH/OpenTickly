# Toggl Timer Time Entry Block 点击弹窗研究

本文件只回答一个问题：

> 在 Calendar view 里点击 `time entry block` 之后，出来的弹窗到底是什么？

为了方便后续落地，本文件分成两块：

1. 功能记录（偏 PRD）
2. 技术实现记录

## 1. 结论先说

左键点击普通 `time entry block` 后，Toggl 打开的不是全屏 modal，也不是右键菜单，而是一个：

```text
锚定在该 block 附近的编辑型 context popup
```

从运行时抓到的类名看，它就是：

```text
TimeEntryContextPopup
```

实际容器类名：

```text
css-v6dxq6-Popup-raised50-floating-TimeEntryContextPopup
```

所以更准确的命名应该是：

- 不是 “dialog”
- 不是 “modal”
- 是一个 **time entry 编辑弹层 / anchored context popup**

## 2. 功能记录（PRD 视角）

## 2.1 目标

点击 block 后，这个弹窗的核心目标不是“只看详情”，而是：

- 直接编辑该条 time entry
- 提供最常用的快捷动作
- 保持用户仍在当前 calendar 上下文中

也就是典型的 **inline edit / contextual edit**。

## 2.2 打开方式

当前已确认有两种相关入口：

### 左键点击 block

打开编辑型 popup，本次实际观察到的内容包括：

- `Continue Time Entry`
- `Duplicate Time Entry`
- `More actions`
- 描述输入框（placeholder 为 `Add a description`）
- workspace / organization 相关切换入口（`Change`）
- `Billable`
- 开始时间
- 结束时间
- duration
- `Save`
- `close`

### 右键点击 block

不是打开同一个编辑 popup，而是打开单独的上下文菜单。

当前观察到的菜单项有：

- `Split`
- `Pin as favorite`
- `Copy start link`
- `Delete`

所以左键和右键是两套不同交互。

## 2.3 这个 popup 解决哪些任务

从功能职责上，它至少覆盖了下面几类任务：

### A. 快捷继续 / 复制

顶部直接给两个高频动作：

- `Continue Time Entry`
- `Duplicate Time Entry`

说明 Toggl 认为“基于已有 entry 继续记时”和“复制一条再改”是高频动作，不要求用户先进入二级菜单。

### B. 直接编辑正文

弹窗里可以直接修改：

- description
- billable 状态
- 起止时间
- duration

这意味着它本质上是“轻量编辑器”，不是只读详情卡。

### C. 在当前上下文里改归属

弹窗里出现了 workspace / project 相关区域，且在描述区域展开时能看到：

- `Previously tracked time entries`
- `Projects`

说明弹窗内部带有建议/联想能力，不只是单纯表单字段。

### D. 提供破坏性或次级动作

这些动作不放主区域，而放进 `More actions`：

- Split
- Pin as favorite
- Copy start link
- Delete

这符合常见产品分层：

- 高频动作直接露出
- 次级动作放二级菜单
- 危险动作和编辑主流程分开

## 2.4 交互风格特点

### 非阻塞

它不是整页遮罩，也不锁 body scroll。

用户仍然处在 Calendar 页面里，背景内容继续可见。

### 就地锚定

它贴着被点击的 block 打开，因此用户能一直看到：

- 当前 entry 在时间轴上的位置
- 周视图上下文
- 周总时长和当天布局

### 偏“工作台”而不是“详情页”

从功能上看，这个 popup 更像一个小型工作台：

- 可编辑
- 可触发继续
- 可复制
- 可进入更多动作

而不是单纯说明性质的 info popover。

## 2.5 与 modal 的区别

这个弹窗和 `Invite Members` 那种 modal 明显不同：

- 没有全屏遮罩
- 没有 `aria-modal="true"`
- 没有 `ReactModal__Overlay`
- 不抢整页流程

因此产品语义上它应该归类为：

```text
context popup / inline editor
```

而不是 modal dialog。

## 3. 技术实现记录

## 3.1 点击普通 time entry 后走的是 edit popup

在 `calendar-view` chunk 里，`onSelectEvent` 的逻辑已经能分出几种对象：

- external calendar event
- timeline activity
- invitation
- normal time entry

其中普通 time entry 走的是：

```text
t(te.cy(e.id))
```

同时把点击位置包装成锚点：

```text
D(ii(r))
```

后续页面根据状态渲染：

```text
("create"===B.status||"edit"===B.status) && <j.ZP popupState={B} onDismiss={ue} referenceElement={P} />
```

也就是说：

- `create` 和 `edit` 复用同一个 popup 组件
- 点击已有 block 进入的是 `edit`
- 点击空白时间段创建时进入的是 `create`

## 3.2 它是 anchor-based popup，不是 modal

代码里给这个 popup 传入的是：

- `popupState`
- `onDismiss`
- `referenceElement`

并且 anchor 是通过点击事件动态生成的：

```js
const ii = e => ({
  focus: () => e.target.focus(),
  getBoundingClientRect: () => ({
    top: ...,
    bottom: ...,
    left: ...,
    right: ...,
    width: 0,
    height: 0
  })
})
```

这说明定位不是基于固定 layout，而是：

```text
把点击点/点击元素包装成 reference element，再交给 popup 定位系统
```

## 3.3 运行时 DOM 证据

本次直接观察到的 popup 容器链路：

### 外层定位包装

```text
css-15w5i4j-ReactPopperWrapper
position: absolute
z-index: 400
```

### 主体 popup

```text
css-v6dxq6-Popup-raised50-floating-TimeEntryContextPopup
background: rgb(27, 27, 27)
border-radius: 8px
box-shadow: rgba(0, 0, 0, 0.5) 0px 4px 16px 0px
```

### 内容层

```text
css-ysmm4q-ContentAnimator
css-pydjc-ContextPopupContent-Root
css-1um8qy9-PopupContent
```

所以它明显属于：

- floating popup
- popper/anchor 定位
- 带单独内容动画层

## 3.4 它没有 modal 语义

打开这个 popup 时，页面里没有出现：

- `role="dialog"`
- `aria-modal="true"`
- `ReactModalPortal`

至少这个 time entry 编辑弹窗当前不是按 modal 可访问性语义实现的。

这和 Toggle 的阻塞式 modal 是分开的另一套实现。

## 3.5 More actions 还是另一层 popup

点开 `More actions` 后，又会出现一层独立菜单：

```text
css-kc9j3j-PopdownRoot-raised50-floating-popdownStyles-PopupContent-ContextMenu
position: absolute
z-index: 201
background: rgb(27, 27, 27)
border-radius: 8px
box-shadow: rgba(0, 0, 0, 0.5) 0px 4px 16px 0px
```

它外面还有：

```text
ReactPortalWrapper
position: fixed
z-index: 601
```

所以结构上是：

- 第一层：TimeEntryContextPopup
- 第二层：ContextMenu / Popdown

这也说明 Toggl 没有把所有动作硬塞进主 popup，而是继续拆层。

## 3.6 左键 popup 与右键菜单不是同一个组件

在日历容器里还能看到另一条右键逻辑：

```text
onContextMenu: e => { open({ x: e.clientX, y: e.clientY }, ...) }
```

并且页面底部单独渲染：

```text
<U.Z mode="fixed" usePortal open triggerRef={...}>
  <j.XB isRightClickMenu timeEntry={...} onDismiss={...} />
</U.Z>
```

因此：

- 左键点击 block -> `create/edit` popup
- 右键点击 block -> `isRightClickMenu` 的菜单型弹层

两者不是一个组件。

## 3.7 当前最准确的实现判断

综合运行时观察与 bundle 代码，time entry block 点击后的弹窗最准确的定义是：

```text
一个基于 referenceElement / popper 定位的 TimeEntryContextPopup，
用于 create/edit time entry，
属于非阻塞的 inline editor，而不是 modal dialog。
```

## 4. 对 OpenToggl 的直接启发

如果 OpenToggl 要复刻这类体验，最应该复制的是这几个决策：

- block 左键打开的是就地编辑 popup，而不是跳页
- `create` 与 `edit` 共用同一个编辑弹层
- 右键菜单与左键编辑弹层分开
- 高频动作直接露出，低频动作进入 `More actions`
- 用 anchor / popper 做定位，而不是把它实现成 modal
