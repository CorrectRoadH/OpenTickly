# Toggl 前端实现总览（运行时研究）

本研究基于已登录 `https://track.toggl.com/timer` 页面的运行时观察、DOM 结构、网络资源与已加载 JS/CSS chunk，不是 Toggl 源码仓库级别的静态审阅。

## 1. 总体技术栈

从页面实际加载的资源看，Toggl Track 前端是一个基于 React 的单页应用：

- 资源以 `runtime.*.js + 多个 webpack chunk` 的形式加载
- 页面根节点为 `#root`
- 主要业务代码来自 `https://web-assets.track.toggl.com/app/assets/scripts/*.js`

运行时能直接确认的前端栈包括：

- React
- Webpack chunk 拆包
- Tailwind CSS
- Emotion
- Radix UI 风格的 primitives / overlay 体系
- React Modal
- `react-big-calendar` 及其 drag-and-drop addon
- 设计令牌（CSS variables / theme tokens）

另外页面里还出现了一个 `_goober` style 标签，说明运行时还有少量 goober 风格注入，但从当前页面看它不是主样式系统。

## 2. 样式系统是混合式的

当前页不是单一 CSS 技术，而是多层叠加：

### 2.1 Tailwind

主样式文件里直接包含：

```text
! tailwindcss v3.4.17
```

DOM 中也能看到大量 utility class，例如：

```text
w-full overflow-x-hidden px-1.5 pt-2
flex min-w-0 flex-1 flex-col
rounded border p-1 z-[601]
```

### 2.2 Emotion

页面中存在：

- `style[data-emotion="css"]`
- `style[data-emotion="css-global"]`

DOM 类名里也出现了典型 Emotion 产物，例如：

```text
css-c0l7k4-...
css-1txohfu-...
css-rof3fw-...
```

这类样式主要负责业务组件和覆盖库默认样式。

### 2.3 库自带样式

页面里直接注入了：

- `react-big-calendar` 默认 `.rbc-*` 样式
- `react-big-calendar` DnD addon `.rbc-addons-dnd-*` 样式
- `ReactModal__Overlay` / `ReactModal__Content` 这类 modal 样式

### 2.4 设计令牌

主题主要靠 CSS variables 驱动，例如：

```text
--background-primary: 27 27 27
--foreground-primary: 255 255 255
--theme-radii-regular: 8px
--timer-dashboard-area-height: 238.015625px
```

这让 Tailwind、Emotion、第三方组件样式可以共用统一 token。

## 3. 动画系统

Toggl 的动画不是依赖一个显式的“动画框架”，而是：

- Tailwind / utility class 的状态动画
- Emotion 内联 keyframes
- 第三方组件自带动画

### 3.1 基于状态属性的弹层动画

从组织切换菜单可见，弹层 class 包含：

```text
data-[state=open]:animate-in
data-[state=closed]:animate-out
data-[state=open]:fade-in-0
data-[state=closed]:fade-out-0
data-[state=open]:zoom-in-95
data-[state=closed]:zoom-out-95
data-[side=bottom]:slide-in-from-top-2
```

这说明他们大量使用“状态属性 + utility class”的方式做入场/退场动画。

### 3.2 对 reduced motion 友好

业务 JS 里能直接看到：

```text
@media (prefers-reduced-motion: no-preference)
```

以及：

```text
slideDown 300ms cubic-bezier(0.22, 1, 0.36, 1)
slideUp 150ms cubic-bezier(0.22, 1, 0.36, 1)
```

说明动画系统明确考虑了系统级动效偏好。

### 3.3 业务局部动画

Calendar time entry block 里能看到：

```text
@keyframes fadeIn
animation: fadeIn 0.15s linear
```

这类动画更像“局部状态反馈”，不是全局统一 motion runtime。

## 4. 交互体系

Toggl 当前前端交互有几个明显特点：

### 4.1 重度依赖弹层

同一个 Timer 页面上就能看到多种弹层：

- 日期范围弹层
- 组织切换菜单
- Invite Members 模态框
- Calendar 内上下文 popup / tooltip / menu

### 4.2 Portal 是默认能力

当前页 `body` 末尾可以看到：

- `ReactModalPortal`
- Radix 弹层内容节点
- 其他 portal 容器

说明 overlay 并不是在原位置渲染，而是统一通过 portal 进入顶层。

### 4.3 视觉统一，但实现并不单一

虽然很多弹层长得像同一套设计系统：

- 深色表面
- `8px` 圆角
- raised shadow
- token 化颜色

但它们底层并不是一种实现，至少包含：

- Radix menu / popover / dropdown
- React Modal
- 自定义 anchored popup
- tooltip 组件

## 5. Overlay / dialog 体系结论

“按钮点开后出来的 dialog 是否都走同一套逻辑”的答案是：不是。

更准确地说，是“视觉系统统一，但底层 overlay primitive 至少有三套”：

1. 小型菜单/下拉/日期弹层：Radix 风格 primitives
2. 阻塞式模态框：React Modal
3. 日历上下文 popup / tooltip：自定义 reference-element 弹层包装

它们共享 theme token、shadow、圆角、颜色和层级规范，但不是同一个组件在包打天下。

## 6. 当前最值得复刻的产品特征

如果后续要在 OpenToggl 里吸收 Toggl 的前端经验，最值得注意的是：

- 用成熟库做结构层，不自己从零造 calendar / modal / dropdown
- 用统一 token 把多套组件库外观收敛起来
- 把交互拆成多层 overlay primitive，而不是所有弹层都塞进一个组件
- 用懒加载 chunk 把复杂视图拆出去
- 对动画做 reduced-motion 兼容

## 7. 后续研究拆分建议

这个总览文件适合承接“前端系统层”信息；具体功能应单独拆文件，例如：

- `toggl-timer-calendar-view.md`
- `toggl-timer-time-entry-block.md`
- `toggl-dialog-overlay-system.md`
