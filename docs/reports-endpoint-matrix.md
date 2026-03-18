# Reports Endpoint Matrix

## 目的

把 `Reports API v3` 与 `Insights API v1` 的公开端点整理成逐端点兼容矩阵，作为 `docs/reports-semantics.md` 的补充。

## 使用方式

每个端点条目至少标注：

- 路径与方法
- 能力分组
- 官方摘要
- 官方已明确的关键行为
- 主要证据来源
- 当前实现风险

## 端点矩阵

### 1. Insights / Trends / Profitability

#### `POST /insights/api/v1/workspace/{workspace_id}/data_trends/projects`

- 能力分组：insights / trends
- 官方摘要：Load projects' data trends
- 官方已明确的关键行为：
  - 返回 projects data trends
  - 请求体包含 `start_date`、`end_date`、`previous_period_start`、`project_ids`、`billable`、`rounding`、`rounding_minutes`
  - `400` 可由参数缺失、日期格式错误、开始结束区间错误触发
  - `403` 可由 workspace 不可访问或缺少权限触发
- 主要证据来源：
  - `openapi/toggl-reports-v3.swagger.json`
  - `docs/toggl-official/engineering.toggl.com/docs/reports/insights/index.html`
- 当前实现风险：
  - 中，主要在 trends 计算口径与 previous period 对齐逻辑

#### `POST /insights/api/v1/workspace/{workspace_id}/profitability/employees.{extension}`

- 能力分组：insights / exports
- 官方摘要：Export employee profitability insights
- 官方已明确的关键行为：
  - 导出格式仅 `csv` / `xlsx`
  - 属于 insights 与 exports 双重能力面
- 主要证据来源：
  - OpenAPI
  - Insights docs
- 当前实现风险：
  - 高，主要在 profitability 计算口径

#### `POST /insights/api/v1/workspace/{workspace_id}/profitability/projects.{extension}`

- 能力分组：insights / exports
- 官方摘要：Export profitability project insights
- 官方已明确的关键行为：
  - 导出格式仅 `csv` / `xlsx`
- 主要证据来源：
  - OpenAPI
  - Insights docs
- 当前实现风险：
  - 高，主要在 project profitability 结果一致性

#### `POST /insights/api/v1/workspace/{workspace_id}/trends/projects.{extension}`

- 能力分组：insights / exports
- 官方摘要：Export projects data trends
- 官方已明确的关键行为：
  - 导出格式仅 `csv` / `xlsx`
- 主要证据来源：
  - OpenAPI
  - Insights docs
- 当前实现风险：
  - 中

### 2. Shared / Saved Reports

#### `POST /reports/api/v3/shared/{report_token}`

- 能力分组：saved_reports
- 官方摘要：Load the previously saved report
- 官方已明确的关键行为：
  - public report 任何人可访问
  - private report 仅 owner 或 workspace admin 可访问
  - 不传参数时使用 saved/default 参数
  - 公开错误语义包括 `400/401/403/404`
- 主要证据来源：
  - OpenAPI
  - Saved reports docs
- 当前实现风险：
  - 中高，主要在 token 权限与参数回落

#### `POST /reports/api/v3/shared/{report_token}/csv`

- 能力分组：saved_reports / exports
- 官方摘要：Export CSV for saved report
- 官方已明确的关键行为：
  - shared report CSV 导出
  - public/private 访问控制与 shared report 在线读取一致
- 主要证据来源：
  - OpenAPI
  - Saved reports docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/shared/{report_token}/pdf`

- 能力分组：saved_reports / exports
- 官方摘要：Export saved report in pdf format
- 官方已明确的关键行为：
  - shared report PDF 导出
  - 文档明确 time data display mode 这类显示参数
- 主要证据来源：
  - OpenAPI
  - Saved reports docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/shared/{report_token}/xlsx`

- 能力分组：saved_reports / exports
- 官方摘要：Export XSLX saved report
- 官方已明确的关键行为：
  - shared report XLSX 导出
- 主要证据来源：
  - OpenAPI
  - Saved reports docs
- 当前实现风险：
  - 中

### 3. Comparative / Data Trends / Profitability

#### `POST /reports/api/v3/workspace/{workspace_id}/comparative`

- 能力分组：comparative
- 官方摘要：Load comparative report
- 官方已明确的关键行为：
  - comparative report 是独立入口
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 高，官方 docs 对细节说明较少

#### `POST /reports/api/v3/workspace/{workspace_id}/data_trends/clients`

- 能力分组：data trends
- 官方摘要：Load clients' data trends
- 官方已明确的关键行为：
  - 返回 clients data trends
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/data_trends/projects`

- 能力分组：data trends
- 官方摘要：Load projects' data trends
- 官方已明确的关键行为：
  - 返回 projects data trends
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/data_trends/users`

- 能力分组：data trends
- 官方摘要：Load users' data trends
- 官方已明确的关键行为：
  - 返回 users data trends
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/profitability/projects`

- 能力分组：profitability
- 官方摘要：Load profitability projects report
- 官方已明确的关键行为：
  - 项目盈利报表是正式公开端点
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 高

### 4. Filters / Utils

#### `POST /reports/api/v3/workspace/{workspace_id}/filters/clients`

- 能力分组：utils / filters
- 官方摘要：List clients
- 官方已明确的关键行为：
  - 仅返回 client ID 与名称
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/filters/project_groups`

- 能力分组：utils / filters
- 官方摘要：List project groups filter
- 官方已明确的关键行为：
  - 返回 project groups 过滤器对象
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/filters/project_users`

- 能力分组：utils / filters
- 官方摘要：List project users
- 官方已明确的关键行为：
  - 返回 filtered user projects
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/filters/projects`

- 能力分组：utils / filters
- 官方摘要：List projects
- 官方已明确的关键行为：
  - 返回 filtered projects
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/filters/projects/status`

- 能力分组：utils / filters
- 官方摘要：List projects statuses
- 官方已明确的关键行为：
  - 返回 projects status 过滤器
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/filters/tasks/status`

- 能力分组：utils / filters
- 官方摘要：List tasks statuses
- 官方已明确的关键行为：
  - 返回 tasks status 过滤器
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/filters/users`

- 能力分组：utils / filters
- 官方摘要：List users
- 官方已明确的关键行为：
  - 返回 filtered users
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/search/clients`

- 能力分组：utils / search
- 官方摘要：Search clients
- 官方已明确的关键行为：
  - 与 filters 不同，返回 whole client object
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/search/projects`

- 能力分组：utils / search
- 官方摘要：List projects
- 官方已明确的关键行为：
  - 返回 whole project object
  - docs 明确 `page_size` 默认可观察，`start` 基于 ID 进行分页
- 主要证据来源：
  - OpenAPI
  - Utils docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/search/users`

- 能力分组：utils / search
- 官方摘要：List users
- 官方已明确的关键行为：
  - 返回 filtered users 的搜索视图
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 低

#### `POST /reports/api/v3/workspace/{workspace_id}/{action}/tasks`

- 能力分组：utils / tasks
- 官方摘要：List tasks
- 官方已明确的关键行为：
  - 这是 tasks 相关的通用工具入口
- 主要证据来源：
  - OpenAPI
- 当前实现风险：
  - 中，路径语义抽象度较高

### 5. Summary Reports

#### `POST /reports/api/v3/workspace/{workspace_id}/projects/summary`

- 能力分组：summary_reports
- 官方摘要：List project users
- 官方已明确的关键行为：
  - 返回 summary user projects
- 主要证据来源：
  - OpenAPI
  - Summary docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/projects/{project_id}/summary`

- 能力分组：summary_reports
- 官方摘要：Load project summary
- 官方已明确的关键行为：
  - 返回 project summary
- 主要证据来源：
  - OpenAPI
  - Summary docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries`

- 能力分组：summary_reports
- 官方摘要：Search time entries
- 官方已明确的关键行为：
  - summary 查询具有高阶控制参数，如 `collapse`、`distinguish_rates`、`hide_amounts`、`hide_rates`、`include_time_entry_ids`、`sub_grouping`、`audit`
  - `audit` 内还有 `show_empty_groups`、`show_tracked_groups`、group filter 结构
  - `400/402/403` 有明确语义
- 主要证据来源：
  - OpenAPI
  - Summary docs
- 当前实现风险：
  - 高

#### `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries.pdf`

- 能力分组：summary_reports / exports
- 官方摘要：Export summary report
- 官方已明确的关键行为：
  - summary PDF 导出
- 主要证据来源：
  - OpenAPI
  - Summary docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries.{extension}`

- 能力分组：summary_reports / exports
- 官方摘要：Export summary report
- 官方已明确的关键行为：
  - `extension` 为 `csv` 或 `xlsx`
- 主要证据来源：
  - OpenAPI
  - Summary docs
- 当前实现风险：
  - 中

### 6. Detailed Reports

#### `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries`

- 能力分组：detailed_reports
- 官方摘要：Search time entries
- 官方已明确的关键行为：
  - 使用 `X-Next-ID` 与 `X-Next-Row-Number` 分页
  - 具有 `grouped`、`granularity`、`resolution`、`withInlineRates`、`with_graph` 等参数
  - `400/402/403` 有明确语义
- 主要证据来源：
  - OpenAPI
  - Detailed docs
- 当前实现风险：
  - 高

#### `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries.pdf`

- 能力分组：detailed_reports / exports
- 官方摘要：Export detailed report
- 官方已明确的关键行为：
  - detailed PDF 导出
- 主要证据来源：
  - OpenAPI
  - Detailed docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries.{extension}`

- 能力分组：detailed_reports / exports
- 官方摘要：Export detailed report
- 官方已明确的关键行为：
  - `extension` 为 `csv` 或 `xlsx`
  - 导出参数可包含 `enrich_response`
- 主要证据来源：
  - OpenAPI
  - Detailed docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries/totals`

- 能力分组：detailed_reports
- 官方摘要：Load totals detailed report
- 官方已明确的关键行为：
  - 返回 detailed totals
- 主要证据来源：
  - OpenAPI
  - Detailed docs
- 当前实现风险：
  - 中

### 7. Weekly Reports

#### `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries`

- 能力分组：weekly_reports
- 官方摘要：Search time entries
- 官方已明确的关键行为：
  - 参数中公开暴露 `calculate`、`cents_separator`、`date_format`、`duration_format`、`group_by_task`、`logo_url`
  - `400/402/403` 有明确语义
- 主要证据来源：
  - OpenAPI
  - Weekly docs
- 当前实现风险：
  - 中高

#### `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries.csv`

- 能力分组：weekly_reports / exports
- 官方摘要：Export weekly report
- 官方已明确的关键行为：
  - weekly CSV 导出
- 主要证据来源：
  - OpenAPI
  - Weekly docs
- 当前实现风险：
  - 中

#### `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries.pdf`

- 能力分组：weekly_reports / exports
- 官方摘要：Export weekly report
- 官方已明确的关键行为：
  - weekly PDF 导出
- 主要证据来源：
  - OpenAPI
  - Weekly docs
- 当前实现风险：
  - 中

## 备注

- 这份矩阵聚焦端点和公开行为，不替代 `docs/reports-semantics.md` 中对统计口径和结果合同的定义。
- 对于 comparative、profitability、insights 等高风险计算面，即使端点矩阵已整理完成，仍需后续通过样本和行为验证进一步收敛。
