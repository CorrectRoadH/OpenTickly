# OpenToggl 前端架构

本文档定义 Web 前端的目标结构，重点回答：

- 页面、feature、entity、shared 怎么分
- server state、URL state、form state、local UI state 怎么分
- 组件边界、共享组件、设计系统组件怎么管
- Figma 页面映射进入实现时，数据和状态如何落位

本文档只讨论实现结构；页面语义仍以对应 `docs/product/*.md` 为准。

## 0. 技术栈结论

前端必须明确到具体库，而不是只写抽象分层。

当前建议的正式技术栈是：

- runtime：`React`
- toolchain：`Vite+`
- router：`TanStack Router`
- server state：`TanStack Query`
- forms：`react-hook-form` + `zod`
- UI primitives：`baseui`
- utility styling：`tailwindcss@4`
- styling/runtime：`styletron`

说明：

- `Vite+` 是工具链，不负责决定 router、query、form、UI runtime 方案。
- `TanStack Router` 适合本项目这种重 URL state、重筛选、重视图切换的应用。
- `TanStack Query` 适合 tracking / reports 这类 server state 密集产品面。
- `baseui` 适合数据密集的表单、表格、popover、drawer、select、date/time 场景。
- `tailwindcss@4` 是正式约束，不是可选偏好；默认用于页面布局、间距、栅格、响应式和通用 utility class 组合。
- `styletron` 继续保留，因为 `baseui` 的 theme、override 和运行时依赖它；这不是与 Tailwind 二选一。
- `packages/web-ui` 是基于 `baseui` 的应用级 UI 包，不另造一套设计系统。

## 1. 目标目录

```text
apps/website/
  src/
    app/
    routes/
    pages/
    features/
    entities/
    shared/
      api/
      query/
      session/
      url-state/
      forms/
      ui/
      lib/

packages/
  web-ui/
  shared-contracts/
```

说明：

- 当前真实应用目录是 `apps/website`，文档和实现都应先以它为准。
- 只有在正式重构应用边界时，才考虑是否改名为 `apps/web`。
- `packages/web-ui` 只承载基于 `baseui` 的 theme、token 和薄包装组件，不拥有业务语义。
- `packages/shared-contracts` 只承载对外公开合同类型、schema 或生成产物，不放 view model。

保留 `packages/web-ui`，而不是只在 `apps/website/src/components` 放一堆组件，原因是：

- 它表达的是“跨页面、跨产品面的应用级 UI 基线”，不是某个页面自己的组件文件夹。
- `baseui` 的 theme、token、overrides、表格壳层、表单壳层、page shell 这类能力天然是共享资产。
- 放在 `packages/` 可以强制它不依赖页面、feature、route、session，从结构上阻止业务语义渗进去。
- `src/components` 往往会自然退化成“所有东西都往里丢”的杂物间，这正是这里要避免的。

因此这里的规则不是“我们有些共享组件”，而是：

- `apps/website/src/*` 放产品实现
- `packages/web-ui` 放应用级 UI 基线

## 2. 分层职责

### 2.1 `app/`

负责：

- 应用启动
- provider 装配
- router 注册
- 全局 app shell
- error boundary、theme、i18n、session bootstrap

最低 provider 组成：

- `StyletronProvider`
- `BaseProvider`
- `QueryClientProvider`
- `RouterProvider`
- session / auth provider

不负责：

- 具体业务页面逻辑
- 实体映射
- feature 内部状态机

### 2.2 `routes/`

负责：

- `TanStack Router` route tree
- route-level guard
- path params / search params schema
- 与 URL 强绑定的 loader/redirect
- 视图切换与筛选状态的 URL 归一化

规则：

- `routes/` 不是泛泛的“路由目录”，而是 `TanStack Router` 的正式入口。
- search params 必须有 schema，不允许页面自己散着 parse。
- `routes/` 负责“怎么进入页面”，不负责“页面里怎么工作”。
- 复杂页面数据拼装不放在 `routes/`，而放到 `pages/` 或 `shared/query/`。

### 2.3 `pages/`

负责：

- 页面装配
- 页面级布局切分
- 把多个 feature/entity 组合成一个完整页面
- 接住 route params、search params，并下发到下层

规则：

- `pages/` 可以读取 query hook、URL state、session，但不直接写底层请求细节。
- `pages/` 不承载可跨页面复用的业务流程；那属于 `features/`。

明确禁止：

- `pages/` 直接调用 `fetch`、`webRequest` 或等价底层 client
- `pages/` 直接消费 raw backend DTO 并在页面内部拼装展示语义
- `pages/` 直接承载 mutation 流程、提交编排、错误恢复或批量操作状态机
- `pages/` 以“当前只是一个简单列表/表单页”为理由跳过 `feature` / `entity` 分层

### 2.4 `features/`

负责：

- 用户动作流
- 带副作用的交互
- 小范围业务状态机
- 表单提交、批量操作、modal/drawer 工作流

典型 feature：

- `start-timer`
- `stop-timer`
- `edit-time-entry`
- `bulk-update-time-entries`
- `create-project`
- `archive-project`

规则：

- `feature` 是按动作切，不是按视觉块切。
- 一个 feature 可以被多个页面复用。
- `feature` 可以依赖 `entities/` 和 `shared/*`，但不依赖其他 feature。

### 2.5 `entities/`

负责：

- 领域对象展示组件
- DTO -> view model 映射
- entity label / badge / row / card / summary 等展示单元
- 与单个实体相关但不带复杂流程的 selector/filter helper

规则：

- 页面和 feature 尽量消费 entity view model，不直接消费 raw DTO。
- 同一实体的格式化规则、状态文案、颜色映射、显示字段优先集中在 `entities/`。

这条规则同样适用于生成合同类型：

- `packages/shared-contracts` 只承载公开合同类型、schema 和生成产物
- view model、页面展示语义、空态/状态文案、派生字段不放在 `shared-contracts`
- 如果页面直接依赖合同生成类型完成展示拼装，默认说明 `entity` 层缺位

### 2.6 `shared/*`

职责固定：

- `shared/api/`：HTTP client、request/response schema、API adapter
- `shared/query/`：`TanStack Query` 的 query key、fetch hook、mutation 包装、缓存策略
- `shared/session/`：当前用户、workspace、鉴权上下文
- `shared/url-state/`：与 `TanStack Router` search params 同步的过滤、排序、分页、视图切换
- `shared/forms/`：`react-hook-form` + `zod` schema、default values、DTO/form adapter
- `shared/ui/`：应用内共享但未上升到 `baseui` 薄封装层的通用组件
- `shared/lib/`：纯函数、日期/货币/时长格式化、通用 helper

## 3. 状态管理规则

前端状态固定分为四类，不允许混用。

### 3.1 Server State

定义：

- 来源于后端
- 需要缓存、重取、失效、乐观更新或并发保护

规则：

- 必须进入 `shared/query/`
- 必须通过 `TanStack Query` 的统一 query key 管理
- 不允许页面自己维护第二份“同步中的服务端镜像”
- mutation 成功后的 cache invalidation 或 cache update 必须集中定义

典型例子：

- 当前 workspace 的 time entries
- running timer
- projects / clients / tags 列表
- timesheet summary
- webhook subscriptions

### 3.2 URL State

定义：

- 应该体现在地址栏
- 刷新、分享、返回、前进后退后必须保留

规则：

- 必须进入 `shared/url-state/`
- 必须通过 `TanStack Router` search params schema 统一解析
- 与路由参数、search params 保持双向同步
- 不能只藏在组件本地 state 里

典型例子：

- 日期范围
- `calendar | list | timesheet` 视图模式
- 搜索词、过滤器、排序、分页
- 当前选中的 workspace、report preset、tab

### 3.3 Form State

定义：

- 用户尚未提交的草稿
- 需要校验、dirty tracking、提交前转换

规则：

- 必须通过 `react-hook-form` 与 `shared/forms/` 中的 schema / adapter 组织
- 表单草稿不直接写入 query cache
- DTO 和 form model 可以不同

典型例子：

- 新建 time entry
- 编辑 project
- webhook subscription 配置
- expense 提交表单

### 3.4 Local UI State

定义：

- 纯展示性、短生命周期、无需分享和持久化

规则：

- 只允许留在页面或 feature 内
- 默认用组件本地 state
- 不默认引入全局 store

典型例子：

- modal 开关
- hover / expanded / selected row
- column resize
- panel collapse

### 3.5 全局 Store 规则

默认不引入通用全局 store，例如 `zustand` / `redux`。

只有同时满足以下条件才允许新增：

- 状态跨多个非父子页面共享
- 不是 server state
- 不是 URL state
- 不是表单草稿
- 如果放在 `session/` 或 provider 会造成明显耦合或性能问题

允许的少数候选：

- 全局 command palette
- 多区域协同的临时 UI workflow
- 浏览器级离线/重连提示状态

新增全局 store 前，必须先在 review 中明确写出“为什么 `TanStack Query` / router search state / form state / local state 都不适合”。

## 4. 组件管理规则

组件分四层：

- `pages/*`：页面骨架与区域装配
- `features/*`：带行为的业务组件
- `entities/*`：实体展示组件
- `shared/ui` 或 `packages/web-ui`：基于 `baseui` 的纯通用 UI 组件

判断规则：

- 如果组件知道如何提交、删除、启动、停止，它属于 `feature`
- 如果组件只负责展示某个实体或实体片段，它属于 `entity`
- 如果组件完全不知道业务对象，只关心视觉和交互基元，它属于 `shared/ui` 或 `packages/web-ui`
- 如果组件只在某个页面里做布局拼装，它属于 `page`

样式分工规则：

- 页面级布局、grid、stack、间距、尺寸、响应式切换默认使用 `tailwindcss@4`
- `baseui` primitive 的 theme、override 和复杂交互样式继续通过 `styletron` 与 `packages/web-ui` 管理
- 不要在页面层再平行引入另一套 CSS-in-JS 方案
- 不要把业务语义样式 token 塞进全局散落的 CSS 文件；优先通过 Tailwind utility 或 `packages/web-ui` 收口

禁止：

- 把“看起来是一个卡片”就塞进 `web-ui`
- 把 DTO 映射、权限文案、业务状态颜色写进 design system 组件
- 页面直接内联复杂业务组件，绕过 `feature`

## 5. 正式页面完成标准与占位页退出规则

正式页面的完成标准不只是“接口通了、表单能提交、列表能展示”。

如果对应 PRD 已绑定 Figma 节点或明确 fallback 骨架来源，则页面完成时必须同时满足：

- 已记录 `PRD -> Figma 节点或 fallback -> 页面实现 -> page flow/e2e -> 截图或证据`
- 页面信息架构、主次区域、关键状态与共享导航语义已对齐
- 空态、加载态、错误态不是临时默认文案或开发期说明文案
- 不再以 `placeholder`、`contract-backed`、`Wave x slice`、`tracer shell` 等叙事作为完成依据

以下情况一律视为过渡态，不得宣称正式完成：

- 通用列表/卡片/表单占位页准备“后面再贴 Figma”
- 为了先扩页面数量，复用同一套页面骨架而没有对齐各自产品语义
- 页面文案仍在解释这是当前 wave、placeholder slice 或 contract-backed shell
- 尚未明确该页面的 Figma 引用或 fallback 骨架来源

如果某个正式页面暂时只能以过渡态存在，任务单里必须显式写明：

- 当前缺失的 Figma 节点或对齐证据
- 临时页面与目标页面的差距
- 退出该过渡态的所属波次与 gate

## 5. `packages/web-ui` 与 `baseui` 规则

只有满足以下条件才能进入 `packages/web-ui`：

- 不依赖 OpenToggl 业务对象
- 不依赖路由、session、query、feature flag
- 可以在多个页面、多个 feature 中复用
- API 以视觉与交互能力命名，而不是业务命名

`packages/web-ui` 的职责是：

- 集中 `baseui` theme / token / overrides
- 提供有限的薄包装组件
- 统一应用级视觉基线
- 承接 `baseui + styletron` 与 `tailwindcss@4` 的边界，把 design token 和 utility class 约定收束为稳定基线

不是职责：

- 重造 `baseui` 已有 primitives
- 把业务语义组件伪装成 design system
- 脱离 `baseui` 另起一套组件 API

与 `apps/website/src/components` 的分工：

- 业务组件、页面组件、实体组件都留在 `apps/website/src`
- 只有跨页面复用且不带业务语义的 UI 基线组件，才进入 `packages/web-ui`
- 如果一个组件需要 import route、query、session、entity、feature，它就不属于 `packages/web-ui`

允许：

- button、input、dialog、sheet、tabs、data-table shell
- 空状态骨架、筛选条容器、page header、toast primitive

不允许：

- `TimeEntryCard`
- `ProjectStatusBadge`
- `RunningTimerHeader`
- `BillingGateNotice`

这些属于 `entities/` 或 `features/`。

优先级规则：

- 页面与业务组件的布局、间距、响应式优先使用 `tailwindcss@4`
- 能直接用 `baseui` 的地方，先用 `baseui`
- 需要统一 theme / token / override 时，包一层 `packages/web-ui`
- 只有出现业务语义时，才进入 `entities/` 或 `features/`

## 6. 数据流规则

默认数据流：

```text
route params/search params
-> page
-> query hook / feature
-> entity view model
-> ui component
```

规则：

- raw DTO 不直接下发到深层 UI 组件
- view model 映射优先靠近 `entities/`
- feature 提交 mutation 时使用 input model，不直接把 form data 原样透传给底层
- 页面切换视图时，只替换投影层，不复制另一套数据模型

这条规则对 `tracking` 的 `calendar/list/timesheet` 尤其重要：它们共享同一路由族、筛选、日期范围和 running timer 状态，只切换主内容投影。

## 7. 页面族与壳层

共享壳层由 `app/` 持有，至少包括：

- workspace switcher
- 左侧导航
- running timer 状态入口
- profile/admin 入口
- 全局 toast / dialog / command palette

页面族规则：

- `timer` 的 `calendar`、`list`、`timesheet` 是同一路由族
- `project`、`client`、`tag` 共享相同的信息架构骨架，但实体字段不同
- `profile` 与 `settings` 必须分离，不混成“一个超大设置页”
- `integrations webhooks` 在首版是正式产品页，不包装成空 marketplace

这些页面语义以对应 `product` 文档为准，前端实现不得擅自重命名成另一套信息架构。

## 8. 前端测试入口

前端测试分层以 [testing-strategy](./testing-strategy.md) 为准，但最低要求是：

- `shared/lib` 与 entity mapper 有单测
- 关键 feature 有组件级交互测试
- 关键页面族有流程级测试
- Figma 已定义的正式页面必须有至少一条可回归的页面/流程测试路径

## 9. Review 检查项

前端 review 至少检查：

- server state 是否被错误地塞进 local state 或 store
- URL state 是否真正进地址栏
- DTO 是否先映射成 view model 再被组件消费
- 业务组件是否错误地下沉到 `web-ui`
- 页面是否只做装配，而不是吞下全部逻辑
- 同一页面族是否共享同一套 query/filter/running timer 事实来源
- 是否绕开 `TanStack Router` / `TanStack Query` / `baseui`，另造平行机制
