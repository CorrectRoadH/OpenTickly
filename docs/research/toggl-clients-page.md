# Toggl Clients 页面研究

当前研究页面：

```text
https://track.toggl.com/6296488/clients
```

## 1. 页面定位

Clients 页面是一个轻量级的客户目录工作台，用来：

- 新建 client
- 查看 client 关联的项目数
- 编辑 client
- 归档或删除 client

和 Projects 页相比，它明显更轻：

- 列更少
- 没有复杂批量筛选体系
- 主要围绕“client 名称 + 关联项目数”展开

## 2. 当前界面结构

当前 live 页面可见：

- 页面标题：`Clients`
- 主按钮：`New client`
- 状态筛选：`Show active`
- 搜索框：`Search clients...`
- 表头：`CLIENTS | PROJECTS`

初始样本里，当前页共有 11 条 row。

每一行主要由以下元素组成：

- 行勾选框
- client 名称
- 项目数量（如 `(0)`、`(1)`、`(3)`）
- 行尾 `More options`

## 3. New Client 弹窗

点击 `New client` 后会打开模态层，当前可见字段为：

- 标题：`New Client`
- `CLIENT NAME`
- `ADD PROJECTS`
- 项目输入框占位：`Start typing to find or create...`
- 提交按钮：`Create client`

这说明创建 client 时，除了名字，还支持在同一个弹窗里直接把项目挂到该 client 下。

## 3.1 创建校验

在不填名字直接点击 `Create client` 时，页面出现前端校验：

- `Client name is required`

因此名字是必填项，而且这个校验在提交前就会阻断。

## 4. Edit Client 弹窗

在行级 `More options` 中点击 `Edit` 后，会打开 `Edit Client` 模态层。

当前观察到的编辑弹窗结构与创建弹窗基本一致：

- 标题：`Edit Client`
- `CLIENT NAME`
- 预填已有 client 名称
- `ADD PROJECTS`
- 项目输入框：`Start typing to find or create...`
- 提交按钮：`Save`

因此 Create / Edit 基本共用同一套 client 表单，只是标题、初始值、提交文案不同。

## 5. 行级菜单

当前行级 `More options` 菜单明确可见：

- `Edit`
- `Archive`
- `Delete`

对应的权限也能在 API 返回里看到：

- `update`
- `archive`
- `remove`

所以页面 UI 与接口权限字段是对齐的。

## 6. 状态筛选

点击 `Show active` 会展开一个很轻的状态选择器，选项为：

- `Active`
- `Archived`
- `Both`

选择 `Both` 后，按钮文案会变成：

- `Show both`

同时请求变为：

```text
GET /api/v9/workspaces/6296488/clients?status=both&page=1&per_page=50
```

因此这个筛选器直接映射 `status` 查询参数。

## 7. 搜索行为

页面顶部搜索框为：

- `Search clients...`

在当前已加载列表中输入 `华` 后，页面只剩匹配的 `华纳` 一行。  
这次交互中没有观察到新的 clients 搜索请求，因此当前行为看起来更像：

- 先加载当前页 clients 数据
- 再在前端对当前结果做本地过滤

至少在这一页样本里是这样。

## 8. 主要 API

## 8.1 主列表接口

```text
GET /api/v9/workspaces/6296488/clients?status=active&page=1&per_page=50
```

返回的 client 对象包含：

- `id`
- `wid`
- `archived`
- `name`
- `at`
- `creator_id`
- `permissions`
- `total_count`

样本里每条都带有：

```json
"permissions":["archive","update","remove"]
```

以及：

```json
"total_count":11
```

这里的 `total_count` 是列表总条数，不是单个 client 的项目数。

## 8.2 状态切换后的同一接口

例如切到 `Both`：

```text
GET /api/v9/workspaces/6296488/clients?status=both&page=1&per_page=50
```

说明 active / archived / both 只是同一资源的不同查询态。

## 8.3 `clients/data`

页面还会请求：

```text
POST /api/v9/workspaces/6296488/clients/data
```

样本请求体：

```json
{"client_ids":[58133327,58133329]}
```

返回是这些 client 的轻量详情列表，例如：

```json
[
  {"id":58133327,"wid":6296488,"archived":false,"name":"自己","at":"2024-02-28T13:40:47+00:00","total_count":0},
  {"id":58133329,"wid":6296488,"archived":false,"name":"罗燕","at":"2024-02-28T13:40:47+00:00","total_count":0}
]
```

说明页面除了主列表外，还会按需做小批量 client 数据补取。

## 8.4 每个 client 的项目数不是主列表直接带全量结果

页面还会按 client 单独发请求：

```text
GET /api/v9/workspaces/6296488/projects?actual_hours=true&active=true&force=false&page=1&client_ids=<clientId>&per_page=1&billable=both
```

例如：

```text
GET /api/v9/workspaces/6296488/projects?actual_hours=true&active=true&force=false&page=1&client_ids=68556435&per_page=1&billable=both
```

这说明 Clients 页中每行显示的项目数量，并不是单靠 `clients` 主列表直接完成，而是会额外探测某个 client 下的项目数据。

从 `per_page=1` 看，这更像是“为行级摘要拿计数/存在性”的轻量请求，而不是完整项目列表加载。

## 9. 当前结论

Clients 页是一个简单的客户管理页，核心能力很集中：

- 建 client
- 改 client
- 看 client 下有几个项目
- 归档 / 删除 client

技术上它的结构也比 Projects 页简单很多：

- 主列表用 `GET /clients`
- 状态筛选改 `status`
- 行菜单直接映射 `update / archive / remove`
- 项目数通过额外的 projects 探测请求补齐
