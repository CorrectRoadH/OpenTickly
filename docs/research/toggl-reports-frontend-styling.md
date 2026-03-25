# Toggl Reports 前端样式与组件实现研究

这个文档只关注 Reports 页的前端视觉与样式实现：

- 用了什么前端样式方式
- 什么颜色
- 什么圆角、边框、阴影
- 什么组件库痕迹
- 哪些地方是 Reports 自己的特殊风格

不讨论后端请求与数据接口。

## 1. 总体判断

Reports 页不是单一组件库直接拼出来的，而是一个明显的混合式前端体系：

- Tailwind utility class 仍在用
- Emotion / styled 生成类大量存在
- 共享 design primitives 很重
- 菜单 / trigger / popover 仍是统一 overlay 体系

从当前 DOM 直接能看到两类 class 同时存在：

### 1.1 utility / token 风格

例如：

- `bg-secondary`
- `bg-primary`
- `text-primary`
- `text-accent`
- `rounded`
- `rounded-full`
- `rounded-[64px]`
- `hover:bg-secondary-hover`
- `flex`
- `min-h-screen`

这说明 Reports 页仍在消费一层 utility-style class，风格很像 Tailwind + 设计 token 映射。

### 1.2 Emotion / styled 风格

例如：

- `css-ukm7g9-Page-StyledPage`
- `css-1o4z63e-Header-block-StyledHeader`
- `css-11imvxo-Container-StyledCard-MainCard`
- `css-dqcj25-Title-planTitle-Title-nextHeadingBase-nextH2Display`
- `css-16kt9zp-StyledButton-AnalyticsFilters-RawTrigger`
- `css-vpalsy-BreadcrumbsLink-BreadcrumbsItem-BreadcrumbsLink`

这些 class 名里保留了语义 label，明显不是纯 utility，而是 CSS-in-JS 产物。

## 2. Reports 页的主色板

当前 live 直接测到的核心颜色：

### 2.1 页面背景

- 页面主背景：`rgb(18, 18, 18)` = `#121212`

对应：

- `bg-secondary`
- `css-ukm7g9-Page-StyledPage`

这是 Reports 页最外层的大底色。

### 2.2 Header / card 背景

- header / card 常见背景：`rgb(27, 27, 27)` = `#1B1B1B`

例如：

- `css-1o4z63e-Header-block-StyledHeader`
- `css-11su03w-Card...`
- `css-cnfg9m-Card...`

所以 Reports 的层次关系是：

- 页面底色更深：`#121212`
- 卡片 / header 稍微抬亮：`#1B1B1B`

## 2.3 主文字色

- 主文字：`rgb(250, 250, 250)` = `#FAFAFA`

用于：

- KPI 标题
- 图表标题
- 按钮文字
- 输入框正文
- breadcrumb

这是很典型的高对比度暗色主题白字。

## 2.4 次级文字色

- 次级文字：`rgb(153, 153, 153)` = `#999999`

用于：

- tab 文本
- 描述输入 placeholder / 次信息
- 较弱层级文案

Reports 不是用很多花色，而是主要靠：

- `#FAFAFA`
- `#999999`
- 深浅两层背景

来建立信息层级。

## 2.5 分隔线 / 描边色

当前大量模块不是直接画 border，而是用阴影模拟 1px outline：

```text
box-shadow: rgb(58, 58, 58) 0px 0px 0px 1px
```

也就是：

- `rgb(58, 58, 58)` = `#3A3A3A`

这个颜色在 Reports 里非常关键，负责：

- header 外框
- card 外框
- 行内分隔
- builder 占位态边界

相比直接 `border: 1px solid ...`，他们更偏向：

```text
shallowBlock + 1px outline shadow
```

## 3. 形状语言

## 3.1 核心圆角是 8px

当前实测最稳定的圆角就是：

- `border-radius: 8px`

出现位置：

- 顶部 tab
- `Add filter`
- `Export`
- filter pills
- KPI 卡片
- 图表卡片
- builder 虚线空状态卡

这说明 Reports 页的核心块级形状不是大圆角，而是非常克制的：

```text
8px rounded
```

## 3.2 空状态 builder 会用更强的虚线边框

自定义报表 builder 空状态卡：

- 背景：`rgb(0, 0, 0)` = `#000000`
- 边框：`2px dashed rgb(58, 58, 58)`
- 圆角：`8px`

这和普通报表卡片不同，明显是在表达：

- 这里是一个可放图表的“编辑画布”
- 不是已有数据卡片

## 4. Typography 层级

## 4.1 tab / 操作按钮

tab 与大多数工具按钮的字体非常统一：

- `font-size: 14px`
- `font-weight: 600`
- `line-height: ~20px`

例如：

- `Summary`
- `Detailed`
- `Workload`
- `Profitability`
- `My reports`
- `Export`
- `Add filter`

这说明 Reports 工具条大量使用的是统一的：

```text
h5Subtitle / semibold 14px
```

## 4.2 KPI 标题与 KPI 值

Summary 页：

- `Total Hours`：`14px / 600`
- `0:35:00`：`16px / 600`

所以 KPI 没有做特别夸张的大数字，而是：

- 标题小号 semibold
- 数值只比标题大一个台阶

整体偏信息密度优先，而不是 dashboard marketing 风格。

## 4.3 Builder 标题与副标题输入

自定义报表 builder：

- 标题输入 `Untitled`
  - `font-size: 20px`
  - `font-weight: 600`
- 描述输入 `Add description`
  - `font-size: 14px`
  - `font-weight: 500`
  - 文字色 `#999999`

所以 builder 页比普通报表页多了一层“编辑器标题排版”。

## 4.4 空状态标题

builder 空状态标题：

- `Add a chart to get started`
  - `font-size: 24px`
  - `font-weight: 700`

这比普通报表标题明显更重，用于表达：

- 这是 onboarding / zero-state
- 不是普通图表卡片标题

## 5. 组件层面的特别点

## 5.1 tab 不是高亮填充 pill，而是低对比 neutral pill

当前 tab 的实测样式很克制：

- 背景透明
- 字色 `#999999`
- `padding: 6px 12px`
- `border-radius: 8px`

即使 active tab 也没有看到强烈填充背景。  
这和很多 SaaS 里“选中 tab 高亮成品牌色块”不同。

Reports 这里的做法更像：

- 通过位置和微弱状态表达当前页
- 避免工具条太跳

## 5.2 顶部 filter 是轻量 pill，不是重型 dropdown button

像：

- `Member`
- `Client`
- `Project`
- `Task`
- `Tag`
- `Description`

这些 pinned filter pill 的实测风格：

- 高度约 `36px`
- 左右 padding `12px`
- 圆角 `8px`
- 透明背景
- 白字

视觉上更像“标签胶囊 + 轻交互”，不是夸张的表单控件。

## 5.3 `Add filter` / `Export` 都是透明 tertiary button

它们的共同点：

- 透明背景
- 无可见 border
- 白字
- 8px 圆角
- 14px / 600
- padding 大致 `8px 12px`

所以 Reports 工具栏动作普遍不是 filled primary button，而是：

```text
low-chrome toolbar action
```

这能保持报表内容本身更显眼。

## 5.4 KPI 卡片和图表卡片共享同一张卡片语言

无论是：

- 顶部 KPI
- `Duration by day`
- `Project distribution`
- `Project and member breakdown`

它们都共享类似 primitive：

- `shallowBlock`
- `shallowBlockRounded`
- 1px outline shadow
- `#1B1B1B` 背景
- 8px 圆角

这说明 Reports 页不是每块单独定制，而是复用了同一套 analytics card primitives。

## 5.5 表格头部支持拖拽排序，样式也服务这个交互

当前列头会出现：

- `Show column options`
- `roledescription="sortable"`

这意味着表头不是死表格，而是可排序/可配置的 interactive header。  
样式上也因此不是普通 `<th>` 外观，而是：

- 独立按钮式 header item
- 带拖拽说明
- 带更多列选项入口

## 6. Builder 页的特别前端风格

## 6.1 这是一个真正的报表编辑器，不是 modal form

`/reports/.../custom/new` 的 builder 页明显有编辑器感：

- breadcrumb
- 标题输入
- 描述输入
- period bar
- filter bar
- `Add chart`
- 大块空画布

它用的是“页面级 builder”，不是弹窗式 wizard。

## 6.2 空状态主卡是最有辨识度的样式

builder 空状态主卡：

- 黑底
- 2px dashed `#3A3A3A`
- 8px 圆角
- 大面积留白
- 24px / 700 的标题

这个样式和普通报表卡片明显区分开：

- 普通卡片是已有内容容器
- 它是“等待被填充的画布”

## 6.3 layout 是 12 列 grid

bundle 里能直接看到：

```text
StyledChartCards
grid-template-columns: repeat(12, 1fr)
```

这说明自定义报表 builder 的 chart 排布不是简单纵向列表，而是：

- 12-column dashboard grid

这和常见 BI/dashboard builder 的布局方式一致。

## 7. 从 bundle 看出来的样式 primitive

前端 bundle 里直接能看到一组共享样式函数：

### 7.1 `shallowBlock`

```text
background-color: theme.colors.surface_primary.regular;
box-shadow: 0 0 0 1px theme.colors.stroke_primary.regular;
```

### 7.2 `shallowBlockRounded`

```text
shallowBlock + border-radius: regular
```

### 7.3 `innerBlock`

```text
box-shadow: 0 1px 0 0 theme.colors.ui_010.regular;
```

### 7.4 `floating`

```text
background-color: theme.colors.surface_primary.regular;
border-radius: regular;
padding: 15px;
```

这几个 primitive 很关键，因为它们说明 Reports 不是零散写样式，而是建立在共享 token + primitive 之上。

## 8. 当前最值得注意的前端结论

如果要复刻 Toggl Reports，最容易出问题的前端点不是图表本身，而是这几件事：

- 暗色层级要非常克制：`#121212` 页面、`#1B1B1B` 卡片、`#3A3A3A` 描边
- 大多数工具按钮必须是透明的，不要乱做 filled primary
- 8px 圆角几乎是通用规则
- 卡片外框更像 1px outline shadow，不像普通 border-heavy UI
- 自定义报表 builder 要做成真正的 12 列 dashboard editor，不是“表单加预览”
- utility class 和 Emotion/styled 是并存的，不要误判成单一 Tailwind 项目

## 9. 一句话总结

Toggl Reports 的前端风格本质上是：  
一个建立在共享 dark-theme design primitives 之上的 analytics workbench，外观极克制，主要靠深浅两层背景、1px 描边阴影、8px 圆角和 semibold 14px 文本来组织全部交互与信息层级。
