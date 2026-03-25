# Toggl 响应式实现研究

这份笔记只回答一个问题：

- Toggl 的响应式是不是“纯手写死几个 px”？

结论先说：

- 不是纯写死
- 也不是完全 fluid / container-query-first
- 更像是「utility breakpoint + CSS-in-JS token + CSS 变量 + flex/grid + 少量固定尺寸常量」的混合方案

## 1. 直接结论

从 live DOM、computed style、viewport resize、bundle 片段看，Toggl 至少在 Reports / Timer 这类主工作台页面上，响应式主要靠下面几种机制一起完成：

1. utility breakpoint class
2. CSS-in-JS 里的 theme media token
3. `var(--current-nav-width)` 这类布局变量
4. flex / grid / wrap / overflow 容器
5. 某些组件内部仍保留固定 px 尺寸

所以它不是“整个页面宽度全写死成 1200px/1440px”这种做法。  
但也不是完全不碰固定数值。

## 2. Live UI 证据

## 2.1 宽度缩小时，页面没有直接横向炸掉

在 Reports / Timer 页面把窗口压到窄宽度后，浏览器里实际测到：

- `window.innerWidth ≈ 500`
- `document.body.scrollWidth ≈ 495`
- `document.documentElement.clientWidth ≈ 495`

也就是：

- 页面主体仍然在跟着可视宽度收缩
- 不是单纯保留一个超宽固定桌面布局然后整页横向溢出

## 2.2 同一个动作按钮会按 breakpoint 切换文案

Reports 页直接测到：

- `Save` 的 class: `2xl:hidden`
- `Save and share` 的 class: `hidden 2xl:inline`

窄宽度下：

- `Save` 显示
- `Save and share` 隐藏

桌面较宽时：

- `Save` 隐藏
- `Save and share` 显示

这说明它不是 JS 硬判断文案长度，而是直接依赖断点类。

## 2.3 工具条动作会按 `lg` / `xl` 断点折叠

Reports 页直接抓到：

- `Rounding off`
  - class: `flex items-center !hidden lg:!inline-flex`
- `Create invoice`
  - class: `!hidden xl:!inline-flex ...`

在窄宽度下它们的 `display` 都是 `none`。  
在 `1440px` 宽度下：

- `Rounding off` => `display: flex`
- `Create invoice` => `display: flex`

这已经非常明确说明：

- 响应式不是只靠“元素自然挤压”
- 而是明确使用了 breakpoint-based show/hide

## 2.4 页面底部推广条还用了 pointer 媒体查询

Timer / Reports 页都抓到这一类 class：

```text
fixed bottom-4 left-4 ...
lg:left-[calc(16px+var(--current-nav-width))]
lg:w-[calc(100vw-16px-88px-var(--current-nav-width))]
[@media(pointer:fine)]:hidden
```

说明它不只看 viewport width，还看设备能力：

- `pointer:fine` 时隐藏
- 非 fine pointer 场景才显示

这已经超出“写死几个 px”了，是更完整的响应式条件组合。

## 2.5 布局会依赖导航宽度变量，而不是把内容区宽度写死

当前 live 页面根节点能读到：

```text
--current-nav-width: 226px
```

同时很多宽度计算会写成：

```text
calc(100vw - ... - var(--current-nav-width))
```

这说明内容区布局会把 sidebar/nav 当前宽度作为变量参与计算，而不是：

- 假设侧栏永远某个固定值
- 或把主内容区写死成某个固定宽度

## 3. 从 bundle 里看到的实现痕迹

## 3.1 CSS-in-JS 明确存在 media token

bundle 里能直接看到：

```text
@media ", p.ZP.media.above.xlarge, "{overflow:scroll;}"
```

这说明他们在 Emotion / styled 层面有 theme breakpoint token，例如：

- `theme.media.above.xlarge`

也就是说，除了 DOM 上可见的 `lg/xl/2xl` utility class，他们还有一层 JS 主题断点体系。

## 3.2 容器不是死板定宽，而是 overflow 容器 + 断点调整

bundle 里还看到：

```text
width:100%;
overflow:auto;
@media ... xlarge { overflow:scroll; }
```

这说明某些宽表格 / 宽图表容器的思路是：

- 默认尽量贴满容器
- 不够时交给局部横向滚动
- 在更大断点上切换行为

这种方式很典型，是 data-heavy SaaS 的常见 responsive 策略。

## 3.3 有 flex-wrap / grid，不是全靠固定块

bundle 里能直接看到：

```text
flex-wrap:wrap
grid-template-columns: repeat(12, 1fr)
```

这至少说明两件事：

- 某些行内信息会自动换行
- 自定义报表 builder 是标准 12 列 grid，不是绝对定位拼出来的

## 4. 但它也不是“完全没有固定 px”

这一点也要说清楚。

bundle 里能看到一些明显固定尺寸，例如：

- `min-width: 140px`
- `width: 32px; height: 32px`
- 图表/报表相关常量：
  - `width: 1090`
  - `halfWidth: 550`
  - 以及一些 `120 / 160 / 175 / 190 / 350` 这类宽度常量

所以真实情况更像：

- 页面级布局：响应式
- 组件级细节：会保留很多经验型固定尺寸

这在 analytics 产品里其实很正常，因为：

- KPI 卡片
- 表格列
- 图表图例
- 分页器
- 进度条

这些控件通常都需要一个最小可用宽度，不可能完全靠纯百分比自动解决。

## 5. 更准确的架构判断

如果把 Toggl 的响应式实现方式概括成一句话，我会这样写：

> 它不是“整页固定宽度”方案，而是一个以 utility breakpoints 和 theme media tokens 为主、辅以 CSS 变量、flex/grid/overflow 容器的工作台式响应系统；只是其中不少数据展示组件仍保留固定 px 最小尺寸和经验常量。

## 6. 对复刻实现最有价值的点

如果要复刻 Toggl 这种响应式，不要只学“写几个 `@media (max-width: xxxpx)`”。

更接近它的方式是：

1. 页面 shell 用 CSS 变量控制 nav/content 关系
2. 工具栏动作通过 `lg/xl/2xl` 断点做显隐与文案切换
3. 数据密集模块优先用局部横向滚动容器，而不是强行全压缩
4. builder / dashboard 用 grid，而不是绝对定位
5. 允许组件内部保留 `min-width` 等安全下限

## 7. 最终结论

所以，回答原问题：

- Toggl 的响应式看起来不是简单“写死 xxx px”
- 但也不是完全没有硬编码尺寸

更贴切的说法是：

- 页面级响应式：是系统化的
- 组件级尺寸：仍然有不少固定常量

也就是一个很典型的成熟 SaaS 工作台方案，而不是纯 marketing site 那种全流式布局。
