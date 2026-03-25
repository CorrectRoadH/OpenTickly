# Toggl Reports 页面研究

当前 Reports 导航落点会进入：

```text
https://track.toggl.com/reports/6268826/summary?h=...&wid=6296488
```

它不是单页切换小组件，而是一组真正的报表子路由。

## 1. Reports 页一共有几个 tab

当前可见 5 个主 tab：

- `Summary`
- `Detailed`
- `Workload`
- `Profitability`
- `My reports`

其中前 4 个是内置预设报表，最后一个是自定义报表入口。

前端 bundle 里直接能看到：

```text
["summary","detailed","workload","profitability"]
```

以及对应文案：

- `reports.next.Preset.summary`
- `reports.next.Preset.detailed`
- `reports.next.Preset.workload`
- `reports.next.Preset.profitability`

说明：

- `Summary / Detailed / Workload / Profitability` 是一组固定 preset
- `My reports` 不在这组 preset 里，是另一条自定义报表产品线

## 2. 路由结构

各 tab 对应独立路由：

- `/reports/<organizationId>/summary?...&wid=<workspaceId>`
- `/reports/<organizationId>/detailed?...&wid=<workspaceId>`
- `/reports/<organizationId>/workload?...&wid=<workspaceId>`
- `/reports/<organizationId>/profitability?...&wid=<workspaceId>`
- `/reports/<organizationId>/custom?...&wid=<workspaceId>`

而新建自定义报表则进入：

- `/reports/<organizationId>/custom/new?wid=<workspaceId>`

所以 tab 切换本质上是路由切换，不是单纯的前端局部 state。

## 3. 四个 preset tab 的共同结构

`Summary / Detailed / Workload / Profitability` 共享一套顶部报表工作台骨架：

- period 导航
  - `Select previous period`
  - `This week·W13`
  - `Select following period`
- 顶部筛选 chips
  - `Member`
  - `Client`
  - `Project`
  - `Task`
  - `Tag`
  - `Description`
  - `Add filter`
- 报表操作
  - `Rounding off`
  - `Export`
  - `Settings`
  - `Save and share`
- 支撑数据接口
  - `POST /reports/api/v3/workspace/<wid>/filters/projects`
  - `POST /api/v9/workspaces/<wid>/clients/data`
  - `POST /api/v9/workspaces/<wid>/projects/task_count`
  - `GET /api/v9/workspaces/<wid>/groups`
  - `GET /api/v9/workspaces/<wid>/workspace_users`
  - `GET /api/v9/workspaces/<wid>/currencies`

因此这几页不是各自完全独立实现，而是：

- 共用一套 reports shell
- 共用 filters + dictionaries + share/export/settings 机制
- 再按 tab 切换主查询和主可视化

## 4. 每个 tab 分别做什么

## 4.1 Summary

### 产品功能

Summary 是总览型报表，强调“聚合后的概况 + 分布 + breakdown”。

当前页面可见：

- KPI
  - `Total Hours`
  - `Billable Hours`
  - `Amount`
  - `Average Daily Hours`
- 图表
  - `Duration by day`
  - `Project distribution`
- 汇总表
  - `Project and member breakdown`

它适合回答：

- 这段时间总共做了多少小时
- 时间按天怎么分布
- 时间主要落在哪些 project
- project × member 的聚合结果是什么

### 技术实现

Summary 主数据来自 analytics 查询接口：

```text
POST /analytics/api/organizations/6268826/query?response_format=json_row&include_dicts=true
```

样本请求体之一：

```json
{
  "period":{"from":"2026-03-23","to":"2026-03-29"},
  "filters":[{"property":"workspace_id","operator":"=","value":6296488}],
  "groupings":[
    {"property":"project_id"},
    {"property":"user_id"},
    {"property":"rate"},
    {"property":"currency"}
  ],
  "aggregations":[
    {"function":"sum","property":"duration"},
    {"function":"sum","property":"amount"},
    {"function":"sum","property":"billable_duration"},
    {"function":"sum","property":"non_billable_duration"},
    {"function":"sum","property":"cost_amount"},
    {"function":"sum","property":"profit"}
  ]
}
```

说明 Summary 主要是：

- 按维度 group
- 对 duration / amount / billable / cost / profit 做聚合
- 再在前端渲染成 KPI、图表和 breakdown table

## 4.2 Detailed

### 产品功能

Detailed 是明细型报表，直接展示 time entry 级别的数据。

当前页面可见：

- 区块标题：`Time entries from this week`
- 表头字段：
  - `DESCRIPTION`
  - `DURATION`
  - `MEMBER`
  - `PROJECT`
  - `TAGS`
  - `TIME | DATE`
- 行内入口：
  - `Add time entry`
  - description / billable / project / time range 等直接显示在行里

它适合回答：

- 本周具体记了哪些时间条目
- 每条记录属于谁、哪个项目、什么时间段
- 明细层面做导出、核对、补记和编辑

### 技术实现

Detailed 不是 group-by 聚合视图，而是直接请求明细属性。

样本请求体：

```json
{
  "pagination":{"per_page":100,"page":1},
  "period":{"from":"2026-03-23","to":"2026-03-29"},
  "filters":[{"property":"workspace_id","operator":"=","value":6296488}],
  "attributes":[
    {"property":"client_id"},
    {"property":"description"},
    {"property":"duration"},
    {"property":"project_id"},
    {"property":"start"},
    {"property":"stop"},
    {"property":"tag_ids"},
    {"property":"time_entry_id"},
    {"property":"user_id"},
    {"property":"user_timezone"},
    {"property":"task_id"},
    {"property":"amount"},
    {"property":"billable_duration"},
    {"property":"billable"},
    {"property":"currency"},
    {"property":"rate"},
    {"property":"cost_amount"},
    {"property":"profit"}
  ],
  "ordinations":[{"property":"start","direction":"desc","nulls":"last"}]
}
```

这说明 Detailed 的实现模式是：

- 拉取 time-entry 明细属性集合
- 按开始时间倒序排序
- 再把每一条记录渲染成可操作行

因此它更像“analytics-backed time entry table”。

## 4.3 Workload

### 产品功能

Workload 是负载/利用率报表，强调“人 × 时间桶”的工作量观察。

当前页面可见：

- 核心区块：`Member utilization`
- 目标提示：`(80% target)`
- 指标切换：`Show: Utilization`

页面导览弹层也明确提示：

- `Weekly is now the Workload Report`
- `Change the table view`
- `Member utilization is here!`

说明它承接了旧 Weekly 报表的职责，重点看：

- 人员利用率
- 某个周期内每天/每周/月的工作量分布
- 时间粒度会随着 period 变化调整

### 技术实现

Workload 的样本 analytics 请求体：

```json
{
  "modifiers":{"emptyGroups":true},
  "period":{"from":"2026-03-23","to":"2026-03-29"},
  "filters":[{"property":"workspace_id","operator":"=","value":6296488}],
  "groupings":[
    {"property":"user_id"},
    {"property":"start_date"},
    {"property":"rate"},
    {"property":"currency"}
  ],
  "aggregations":[
    {"function":"sum","property":"duration"},
    {"function":"sum","property":"amount"},
    {"function":"sum","property":"billable_duration"},
    {"function":"sum","property":"non_billable_duration"},
    {"function":"sum","property":"cost_amount"},
    {"function":"sum","property":"profit"}
  ],
  "ordinations":[{"property":"start_date","direction":"asc"}]
}
```

关键点：

- 以 `user_id + start_date` 做 group
- 带 `emptyGroups: true`
- 按日期升序返回

这正好对应 Workload 的产品语义：

- 先以成员为主轴
- 再看每天/每个时间桶的数据
- 允许渲染空位或无数据段

## 4.4 Profitability

### 产品功能

Profitability 是收益性报表，强调收入、成本、利润和盈利率。

当前页面可见：

- KPI
  - `Billable Hours`
  - `Amount`
  - `Cost`
  - `Profit`
- 趋势图
  - `Day trends in Amount, Cost and Profit`
  - `Show: Amount, Cost and Profit`
- 排名图
  - `Top earning projects`
  - `Lowest earning projects`
- breakdown 表
  - `Project and member breakdown`
  - 字段包括 `AMOUNT` / `PROJECT FIXED FEE` / `COST` / `PROFIT` / `PROFITABILITY`

它适合回答：

- 哪些项目最赚钱 / 最不赚钱
- 成本和收入差多少
- 各项目、各成员的 profitability 如何

### 技术实现

Profitability 也是 analytics 聚合页，但比 Summary 多了利润相关限制和字段。

bundle 里还能直接看到 profitability 权限依赖：

```text
{
  profitability: [
    "view_insights_trends",
    "view_user_billable_rate",
    "view_user_labor_cost"
  ]
}
```

样本请求体：

```json
{
  "period":{"from":"2026-03-23","to":"2026-03-29"},
  "filters":[
    {"property":"workspace_id","operator":"=","value":6296488},
    {"property":"currency","operator":"=","value":"USD"}
  ],
  "groupings":[
    {"property":"project_id"},
    {"property":"user_id"},
    {"property":"rate"},
    {"property":"currency"}
  ],
  "aggregations":[
    {"function":"sum","property":"duration"},
    {"function":"sum","property":"amount"},
    {"function":"sum","property":"billable_duration"},
    {"function":"sum","property":"non_billable_duration"},
    {"function":"sum","property":"cost_amount"},
    {"function":"sum","property":"profit"}
  ]
}
```

比 Summary 多出来的关键实现点：

- 明确加 `currency` filter
- 前端渲染 profit / cost / profitability 专属图和表

## 4.5 My reports

### 产品功能

My reports 是自定义报表中心，不是单个 preset 图表。

当前空状态页可见：

- `New report`
- `Create your own custom reports`
- `Preview custom reports`
- `Create a report`

它的职责是：

- 查看自己已有的自定义报表
- 创建新报表
- 管理分享/私有化后的报表集合

进一步进入：

```text
/reports/6268826/custom/new?wid=6296488
```

可以看到真正的 builder：

- breadcrumb：`My reports / Untitled`
- `Add chart`
- 标题输入框：`Untitled`
- 描述输入框：`Add description`
- 共享的 period/filter bar
- 空状态：`Add a chart to get started`

说明 My reports 背后不是一个固定报表，而是报表构建器。

### 技术实现

My reports 的核心后端不是 analytics query 列表，而是 dashboards API。

当前页面请求：

```text
GET /analytics/api/dashboards?organization_id=6268826&pinned=true
GET /analytics/api/dashboards?organization_id=6268826
```

当前样本响应为：

```json
[]
```

前端 bundle 中还能直接看到完整 CRUD：

- `POST /analytics/api/dashboards`
- `GET /analytics/api/dashboards?...`
- `GET /analytics/api/dashboards/{id}`
- `PATCH /analytics/api/dashboards/{id}`
- `DELETE /analytics/api/dashboards/{id}`
- `PATCH /analytics/api/dashboards/{id}/user_options`
- `PATCH /analytics/api/dashboards/{id}/privileges`

因此 My reports 的实现模型是：

- dashboard/report 先作为实体被保存
- builder 负责配置图表与 filters
- analytics query 再作为每张 chart 的数据执行层

## 5. 总体实现结论

Reports 其实可以拆成两大产品层：

### A. 预设报表层

- `Summary`
- `Detailed`
- `Workload`
- `Profitability`

特点：

- 共用同一个 reports shell
- 共用时间范围、过滤器、导出、保存分享能力
- 主数据都基于：
  - `POST /analytics/api/organizations/<orgId>/query`
- 只是每个 tab 的：
  - groupings
  - attributes
  - aggregations
  - 图表和表格布局
  不一样

### B. 自定义报表层

- `My reports`

特点：

- 不属于固定 preset
- 通过 `dashboards` 资源管理“报表定义”
- 在 `/custom/new` 中进入 builder
- builder 里再组合 filters、charts 与 analytics query

## 6. 当前一句话总结

Reports 页共有 5 个 tab：前 4 个是基于统一 analytics 查询框架做不同聚合/明细呈现的预设报表，最后 1 个 `My reports` 则是基于 dashboards API 的自定义报表系统。
