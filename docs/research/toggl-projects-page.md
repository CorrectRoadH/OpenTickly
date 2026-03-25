# Toggl Projects 页研究

本文件研究 Toggl Track 的 Projects 页面：

```text
https://track.toggl.com/projects/<workspaceId>/list
```

重点回答：

1. 从产品上，Projects 页如何组织项目管理工作流？
2. 从技术上，项目列表、过滤器、创建/编辑弹窗、行级操作分别如何落地？

## 1. 产品定义（PRD 视角）

## 1.1 这是一张“项目管理台账”，不是单纯导航页

进入页后，主结构非常稳定：

- 页面标题 `Projects`
- 主按钮 `New project`
- 状态切换 `Show All, except Archived`
- 一排过滤器：
  - `Client`
  - `Member`
  - `Billable`
  - `Project name`
  - `Template`
- 下方项目表格

这说明它的产品定位不是“项目详情入口列表”而是：

```text
project admin workbench
```

也就是：

- 看项目存量
- 筛项目
- 建项目
- 批量浏览
- 对单个项目做管理动作

## 1.2 主体是表格式目录，而不是卡片墙

当前样本里表头为：

- `PROJECT`
- `CLIENT`
- `TIMEFRAME`
- `TIME STATUS`
- `BILLABLE STATUS`
- `TEAM`
- `PINNED`

运行时也直接验证到：

- `tableCount = 1`
- `gridCount = 1`
- `bodyRows = 49`

所以这不是宽松卡片布局，而是标准管理表。

它的产品心智更接近：

```text
back-office index / admin table
```

## 1.3 每一行都混合了“业务状态 + 管理入口”

单行不仅显示项目名，还同时露出：

- client
- 创建/起始日期（当前样本落在 `TIMEFRAME`）
- 已累计时长
- team 可见性或成员入口
- pinned 状态
- 行级 `More options`

所以 Projects 页并不要求用户先进入详情页，很多管理动作直接在表上完成。

## 1.4 创建项目是页内弹窗流，不跳转独立页面

点击 `New project` 后，当前样本直接出现页内 modal：

- `Create new project`
- `Project name`
- `PRIVACY` 开关
- `Manage project members`
- `INVITE MEMBERS`
- `Type a name or email to invite`
- `ACCESS`
- `Regular member`
- `ADVANCED OPTIONS`
- `Create project`

这说明新建项目不是“先到详情页再编辑”，而是先在 overlay 里完成基础配置。

## 1.5 新建弹窗把“隐私 + 成员”放在第一层

当前默认可见字段里最突出的是：

- 名称
- 私有/公开
- 成员邀请
- 成员权限

这说明 Toggl 对项目创建的第一优先级不是财务字段，而是：

```text
who can see and who can join
```

也就是项目可见性和协作边界。

## 1.6 编辑项目比新建更轻，默认只给核心字段

从行级菜单点击 `Edit project` 后，当前样本打开的是预填充 modal：

- `Edit Project`
- `Project name`（已带值，如 `CSAPP`）
- `PRIVACY`
- `Private, visible only to project members`
- `ADVANCED OPTIONS`
- `Save`

跟新建相比，编辑态默认更克制：

- 先给名称和可见性
- 复杂字段折叠到 `ADVANCED OPTIONS`

这符合“先改最常改字段”的管理型产品策略。

## 1.7 行级菜单承载项目生命周期动作

当前样本里，首行 `More options` 打开后可直接看到：

- `Edit project`
- `Add member`
- `View in reports`
- `Archive`
- `Use as a template`
- `Delete`

这基本覆盖了项目对象的主要生命周期：

- 改配置
- 加成员
- 去分析
- 归档
- 模板化
- 删除

所以详情页不是唯一操作入口，表格行就是 mini control surface。

## 1.8 过滤器是运营型筛选，而不是只做关键词搜索

当前样本至少验证了两类过滤器形态：

### Client

打开后出现：

- 搜索框 `Find client...`
- `Projects without client`
- `ALL`
- `NONE`
- client 列表复选项
- `SHOW` / `Active`

### Project name

打开后出现：

- 搜索框 `Find project...`

这说明过滤区不是一个统一搜索框，而是：

- 维度化过滤芯片
- 每个维度自己控制 popdown 内容

其中 `Client` 明显是集合过滤，`Project name` 更像文本过滤。

## 2. 技术实现（运行时证据）

## 2.1 Projects 页是独立路由，但依然是同一 SPA 内部工作区

当前 URL：

```text
https://track.toggl.com/projects/6296488/list
```

左侧导航保持不变，说明它不是独立站点，而是 Track 主应用里的一个管理路由分支。

## 2.2 项目列表的主请求默认就是“当前 workspace 的 active projects”

本次 live 抓到主列表请求：

```text
GET /api/v9/workspaces/6296488/projects?page=1&active=true&only_me=true&per_page=50&sort_field=client_name
```

这说明默认列表并不是“全量任意排序”，而是带有明确约束：

- `active=true`
- `only_me=true`
- `per_page=50`
- `sort_field=client_name`

也就是说 Projects 页默认打开的就是：

```text
active + current scope + first page + sorted list
```

## 2.3 表格展示不是单一接口直出，而是主列表 + 多个补充请求拼装

除主项目列表外，同次加载还抓到：

```text
POST /api/v9/workspaces/6296488/project_users/paginated?users_per_project=5&page=1
POST /api/v9/workspaces/6296488/projects/task_count
POST /api/v9/workspaces/6296488/projects/user_count
POST /api/v9/workspaces/6296488/clients/data
GET  /api/v9/workspaces/6296488/projects/templates
```

这说明页面不是把所有列都押在一个大 payload 上，而是：

- 先拉项目骨架
- 再补成员、任务、用户数、client 数据、template 数据

属于典型前端聚合页。

## 2.4 主列表 payload 已经携带大量项目元数据和权限

项目列表响应里单个项目就包含：

- `id`
- `workspace_id`
- `client_id`
- `name`
- `is_private`
- `active`
- `created_at`
- `color`
- `billable`
- `template`
- `estimated_hours`
- `fixed_fee`
- `actual_hours`
- `actual_seconds`
- `client_name`
- `can_track_time`
- `start_date`
- `status`
- `permissions`
- `pinned`

尤其 `permissions` 非常关键，说明行级菜单和弹窗字段大概率是权限驱动显隐，而不是前端写死。

## 2.5 项目统计补充接口是按“当前页项目 ID 集合”批量查询

例如：

### task count

```text
POST /api/v9/workspaces/6296488/projects/task_count
{"project_ids":[...当前页所有项目 id ...]}
```

### user count

```text
POST /api/v9/workspaces/6296488/projects/user_count
{"project_ids":[...当前页所有项目 id ...]}
```

这说明表格列里的辅助统计不是逐行请求，而是：

```text
page-level batch enrichment
```

这对管理页性能更合理。

## 2.6 client 过滤器是带检索的独立 popdown

打开 `Client` 后，运行时直接看到：

- 独立输入框
- 复选列表
- `Projects without client`
- `ALL / NONE`

并且 client 数据来自：

```text
POST /api/v9/workspaces/6296488/clients/data
{"client_ids":[58133327,58133329]}
```

这说明客户端不是在行里只显示名字，而是有单独的 client 数据层。

## 2.7 新建/编辑项目弹窗共用同一套 project dialog 体系

bundle 中可以直接看到：

- `projects.CreateProjectDialog.title`
- `projects.CreateProjectDialog.submit`
- `projects.EditProjectDialog.title`
- `projects.ProjectDialogs.nameLabel`
- `projects.ProjectDialogs.namePlaceholder`
- `projects.ProjectDialogs.nameIsRequired`
- `projects.ProjectDialogs.nameTooLong`
- `projects.ProjectDialogs.nameIsInUse`

说明 Create / Edit 不是两套完全独立表单，而是同一套 project dialog schema 按模式复用。

## 2.8 创建/编辑表单的“高级字段”比当前 UI 展示更丰富

bundle 文案还能直接确认这些字段能力：

- `Client`
- `Estimates & Billing Options`
- `Billable`
- `Hourly Rate`
- `Time estimate`
- `Recurring`
- `Task-based estimate`
- `Use as a template`
- `Fixed Fee`
- `Default hourly rates`
- `Custom project hourly rate`

所以当前 modal 初始只露出部分字段，但底层 schema 明显支持更完整的项目配置。

## 2.9 新建弹窗在输入层就有同步校验

当前 live 已直接看到空名错误：

```text
Please enter a Project name
```

bundle 还能确认至少还有：

- 名称必填
- 名称长度 `< 256`
- 名称冲突 `This Project name is already in use`
- 固定费用必须大于 0

因此项目表单不是“提交后再统一报错”，而是前端层已经做了较强输入校验。

## 2.10 行级操作至少部分由项目 API 直接承载

bundle API 层可直接看到：

- `PUT /api/v9/workspaces/:wid/projects/:id`
- `POST /api/v9/workspaces/:wid/projects/:id/pin`
- `GET /api/v9/workspaces/:wid/projects/templates`

配合列表响应中的：

- `pinned`
- `template`
- `permissions`

可以推断行级动作大体是：

- 编辑 -> `update`
- pin/template -> 专门字段或专门 endpoint
- 归档/删除 -> 同项目资源级操作

其中本次 live 已明确观察到 UI 入口，但未执行破坏性动作。

## 3. 当前结论

Projects 页本质上是 Toggl 的项目管理后台表：

- 上层是创建与过滤
- 中层是带状态列的项目台账
- 下层是每行的生命周期动作

技术上它不是单请求大页，而是：

- `projects list` 主请求
- `users/task/client/template` 批量补充
- 共享的 create/edit project dialog schema
- 权限驱动的行级能力显隐
