# Toggl 弹层 / Dialog / Overlay 系统研究

本文件回答两个问题：

1. Toggl 各种按钮点开后的弹层是怎么实现的？
2. 它们是不是一套统一逻辑？

## 1. 结论先说

不是一套实现。

更准确地说，Toggl 采用的是：

- 统一视觉系统
- 多种 overlay primitive 并存

当前页已经能明确观察到至少三类：

1. Radix 风格的 menu / popover / dropdown
2. React Modal 风格的阻塞式 modal
3. 自定义 anchored popup / tooltip

## 2. 已确认的三种实现

### 2.1 小型菜单与下拉：Radix 风格

直接证据来自组织切换菜单与日期范围弹层。

#### 组织菜单

打开组织按钮后，DOM 为：

```html
<div
  role="menu"
  data-radix-menu-content=""
  data-state="open"
  data-side="bottom"
  data-align="start"
  id="radix-:r5:"
  aria-labelledby="radix-:r4:"
></div>
```

对应类名还包含：

```text
data-[state=open]:animate-in
data-[state=closed]:animate-out
data-[state=open]:zoom-in-95
data-[side=bottom]:slide-in-from-top-2
origin-[var(--radix-dropdown-menu-content-transform-origin)]
```

这基本可以确定：

- 底层是 Radix dropdown/menu 一类 primitive
- 定位依赖 popper 类能力
- 动画由状态属性驱动

#### 日期范围弹层

日期选择器弹层运行时是：

```text
role="dialog"
id="radix-:rd:"
data-state="open"
data-side="bottom"
data-align="start"
class="...StyledPopoverContent..."
```

说明同样属于 Radix 风格的 popover / content 模型。

### 2.2 阻塞式模态框：React Modal

点击 `Invite Members` 后，`body` 下出现：

```text
ReactModalPortal
ReactModal__Overlay
ReactModal__Content
```

观察到的特征：

- overlay 是 `position: fixed`
- `z-index: 10002`
- 背景是半透明黑色遮罩
- `body { overflow: hidden }`

这说明它不是一个普通 popover，而是典型阻塞式 modal。

### 2.3 上下文 popup / tooltip：自定义 anchored popup

在 calendar bundle 中能直接看到这些接口形态：

```text
popupState
referenceElement
placement
portalId
onDismiss
```

以及右键打开的逻辑：

```text
onContextMenu -> open({ x, y }, ...)
```

这说明 calendar 内部还有一套“基于 reference element 或鼠标坐标”的上下文弹层，不是简单复用 modal。

## 3. 它们共用的视觉规律

虽然实现不同，但外观高度一致：

- 深色背景 `bg-primary`
- 文字 `text-primary`
- 圆角，默认看到的是 `8px`
- raised shadow，如 `shadow-raised-20`
- token 化边框与背景
- 基于 portal 的层级管理

也就是说，Toggl 统一的是设计语言，不是单一底层组件。

## 4. 动画与打开方式也不一样

### 4.1 menu / dropdown / popover

更偏轻量：

- fade
- zoom
- slide
- 基于 `data-state` / `data-side`

适合：

- 组织切换
- 日期选择
- 下拉菜单
- 小范围配置

### 4.2 modal

更偏阻塞流程：

- 进入顶层 portal
- 锁 body scroll
- 全屏遮罩
- 焦点困在 modal 内

适合：

- Invite members
- 需要完整表单/提交动作的场景

### 4.3 contextual popup / tooltip

更偏局部补充：

- 依附某个元素或鼠标点
- 不抢整页焦点
- 适合事件块、提示、快捷动作

## 5. 从产品角度看，为什么不统一成一个组件

因为这三类问题本来就不是一个问题：

- menu / popover 解决“在原地展开少量选项”
- modal 解决“阻塞当前任务，完成一个表单流”
- context popup / tooltip 解决“贴着对象给轻量反馈和快捷操作”

如果强行合成一个“万能 dialog”，最终通常会出现：

- 可访问性混乱
- 焦点管理混乱
- z-index 混乱
- 关闭逻辑和动画不一致

Toggl 的做法明显更成熟：不同交互层级，用不同 primitive。

## 6. 对 OpenToggl 的启发

如果 OpenToggl 后续要补齐这类体验，建议不要做“一个 Overlay 组件包一切”，而是拆成至少三层：

### 6.1 Menu / Dropdown / Popover

用于：

- 组织切换
- 日期选择
- 视图选择
- 小范围设置

### 6.2 Modal Dialog

用于：

- 邀请成员
- 表单式创建/编辑
- 需要阻塞背景的确认流程

### 6.3 Context Popup / Tooltip

用于：

- time entry block 的右键菜单
- hover 提示
- 轻量状态动作

## 7. 最终判断

所以，“各种按钮点击之后出来的 dialog 实现逻辑是一个吗”的最终答案是：

**不是。**

它们共享的是：

- 设计 token
- 视觉规范
- 动效风格
- portal / layering 思路

但底层 primitive 至少分成：

- Radix 式 popover/menu
- React Modal 式 modal
- 自定义 anchored popup / tooltip
