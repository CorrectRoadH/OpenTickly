# Reports Semantics

## 目的

将 `Reports API v3` 的统计口径、freshness、重建语义和导出合同单独定义，避免“字段兼容但结果不兼容”。

## 当前结论

- Reports 是独立产品面，不是 Track API 的附加查询层。
- 兼容目标包括结果口径，而不只是接口存在。
- 本文档只定义外部语义，不定义内部 analytics 存储与计算架构。

## 官方是怎么做的

与 billing 相比，Toggl 官方公开 docs 对 reports 的描述明显更完整。当前可以明确看到的官方做法包括：

- 报表 API 独立于 Track API
  - 路径位于 `/reports/api/v3/...`
  - insights 路径位于 `/insights/api/v1/...`
- 报表类型明确分层
  - detailed reports
  - summary reports
  - weekly reports
  - data trends
  - profitability / insights
  - saved reports / shared reports
  - exports
  - filters / utils

官方 OpenAPI 与 docs 当前明确暴露：

- Detailed
  - `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries`
  - `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries.pdf`
  - `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries.{extension}`
  - `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries/totals`
- Summary
  - `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries`
  - `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries.pdf`
  - `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries.{extension}`
  - 以及项目 summary 相关端点
- Weekly
  - `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries`
  - `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries.csv`
  - `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries.pdf`
- Trends / Insights / Profitability
  - projects / clients / users 的 data trends
  - employee profitability
  - project profitability
  - 对应 `csv` / `xlsx` 导出
- Saved / Shared Reports
  - `GET /reports/api/v3/shared/{report_token}`
  - `POST /reports/api/v3/shared/{report_token}/csv`
  - `POST /reports/api/v3/shared/{report_token}/pdf`
  - `POST /reports/api/v3/shared/{report_token}/xlsx`

官方 docs 还明确了几条关键运行时语义：

- detailed report 分页不是普通 page/page_size，而是通过响应头：
  - `X-Next-ID`
  - `X-Next-Row-Number`
- shared report 有 public / private 访问控制
  - public report 任何人可访问
  - private report 仅 owner 或 workspace admin 可访问
- shared report 如果不传参数，则使用 saved 或 default 参数
- 某些导出场景存在明确公开错误语义：
  - `report is too big to be exported`

官方 OpenAPI 还把报表过滤和导出参数写得很细，明确包含：

- `billable`
- `rounding`
- `rounding_minutes`
- `client_ids`
- `project_ids`
- `task_ids`
- `tag_ids`
- `user_ids`
- `group_ids`
- `time_entry_ids`
- `start_date`
- `end_date`
- `startTime`
- `endTime`
- `duration_format`
- `date_format`
- `grouping`
- `calculate`
- `enrich_response`

这说明官方并不是把 reports 当成“固定几个图表”，而是明确把它做成了一整套复杂查询和导出合同。

## 报表范围

本合同覆盖：

- detailed reports
- summary reports
- weekly reports
- trends
- profitability
- insights
- saved reports
- shared reports
- exports
- filters / search utils

## 逐能力矩阵

### A. Detailed Reports

- 主要端点
  - `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries`
  - `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries/totals`
  - `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries.pdf`
  - `POST /reports/api/v3/workspace/{workspace_id}/search/time_entries.{extension}`
- 官方明确行为
  - 通过 `X-Next-ID` 与 `X-Next-Row-Number` 分页
  - 至少一个参数必须被设置，否则 `400`
  - `402` 表示 workspace 未开通该能力
  - `403` 表示 workspace 不存在或不可访问
- 官方明确参数
  - `billable`
  - `client_ids`
  - `project_ids`
  - `task_ids`
  - `tag_ids`
  - `user_ids`
  - `group_ids`
  - `time_entry_ids`
  - `start_date` / `end_date`
  - `startTime` / `endTime`
  - `grouped`
  - `granularity`
  - `resolution`
  - `rounding`
  - `rounding_minutes`
  - `withInlineRates`
  - `with_graph`
  - `enrich_response`
- 证据强度
  - 强：官方 docs + OpenAPI

### B. Summary Reports

- 主要端点
  - `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries`
  - `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries.pdf`
  - `POST /reports/api/v3/workspace/{workspace_id}/summary/time_entries.{extension}`
  - `POST /reports/api/v3/workspace/{workspace_id}/projects/summary`
  - `POST /reports/api/v3/workspace/{workspace_id}/projects/{project_id}/summary`
- 官方明确行为
  - `400` 可由参数缺失、workspace 非法、参数值非法触发
  - `402` 表示 workspace 未开通该能力
  - `403` 表示 workspace 不存在或不可访问
- 官方明确参数
  - `collapse`
  - `distinguish_rates`
  - `hide_amounts`
  - `hide_rates`
  - `include_time_entry_ids`
  - `order_by`
  - `order_dir`
  - `sub_grouping`
  - `audit`
  - `grouping`
  - `resolution`
  - `rounding`
  - `rounding_minutes`
  - 基本过滤字段同 detailed
- `audit` 相关公开语义
  - `show_empty_groups`
  - `show_tracked_groups`
  - `group_filter`
  - `group_filter.currency`
  - `group_filter.min/max_amount_cents`
  - `group_filter.min/max_duration_seconds`
- 证据强度
  - 强：官方 docs + OpenAPI

### C. Weekly Reports

- 主要端点
  - `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries`
  - `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries.csv`
  - `POST /reports/api/v3/workspace/{workspace_id}/weekly/time_entries.pdf`
- 官方明确行为
  - `400` 可由参数缺失、workspace 非法、不支持的参数、非法参数值触发
  - `402` 表示 workspace 未开通该能力
  - `403` 表示 workspace 不存在或不可访问
- 官方明确参数
  - `calculate`
  - `cents_separator`
  - `date_format`
  - `duration_format`
  - `group_by_task`
  - `grouping`
  - `logo_url`
  - `rounding`
  - `rounding_minutes`
  - 基本过滤字段同 detailed
- 证据强度
  - 强：官方 docs + OpenAPI

### D. Insights / Trends / Profitability

- 主要端点
  - `POST /insights/api/v1/workspace/{workspace_id}/data_trends/projects`
  - `POST /reports/api/v3/workspace/{workspace_id}/data_trends/clients`
  - `POST /reports/api/v3/workspace/{workspace_id}/data_trends/projects`
  - `POST /reports/api/v3/workspace/{workspace_id}/data_trends/users`
  - `POST /reports/api/v3/workspace/{workspace_id}/profitability/projects`
  - `POST /insights/api/v1/workspace/{workspace_id}/profitability/employees.{extension}`
  - `POST /insights/api/v1/workspace/{workspace_id}/profitability/projects.{extension}`
  - `POST /insights/api/v1/workspace/{workspace_id}/trends/projects.{extension}`
- 官方明确行为
  - 存在独立的 insights 路径，而不是附着在 summary/detailed 下
  - 导出主要是 `csv` / `xlsx`
  - `400` 会覆盖日期格式错误、开始结束区间错误、参数缺失等
  - `403` 会覆盖 workspace 不可访问或无所需权限
- 官方明确参数
  - `start_date`
  - `end_date`
  - `previous_period_start`
  - `project_ids`
  - `billable`
  - `rounding`
  - `rounding_minutes`
- 证据强度
  - 中强：官方 docs + OpenAPI

### E. Saved / Shared Reports

- 主要端点
  - `GET|POST /reports/api/v3/shared/{report_token}`
  - `POST /reports/api/v3/shared/{report_token}/csv`
  - `POST /reports/api/v3/shared/{report_token}/pdf`
  - `POST /reports/api/v3/shared/{report_token}/xlsx`
- 官方明确行为
  - public report 任何人可访问
  - private report 仅 owner 或 workspace admin 可访问
  - 不带参数执行时，使用 saved 或 default 参数
  - 公开错误语义包括：
    - `400`：`report_type does not exist in params`
    - `400`：`The report period is not supported`
    - `401`：认证数据提取失败或用户名密码错误
    - `403`：token 无效，或 owner 不再活跃于 workspace
    - `404`：not found
- 证据强度
  - 强：官方 docs + OpenAPI

### F. Exports

- 主要端点族
  - detailed export
  - summary export
  - weekly export
  - saved/shared export
  - insights/profitability/trends export
- 官方明确行为
  - 支持 `csv`、`pdf`、`xlsx`
  - 共享报表存在明确的 “report is too big to be exported” 公开错误语义
  - 导出参数包含显示和格式控制，而不只是过滤条件
- 官方明确参数示例
  - `date_format`
  - `duration_format`
  - `calculate`
  - `cents_separator`
  - `logo_url`
  - `grouping`
  - `sub_grouping`
  - `order_by`
  - `order_dir`
- 证据强度
  - 强：官方 docs + OpenAPI

### G. Filters / Search Utils

- 主要端点
  - `filters/clients`
  - `filters/projects`
  - `filters/projects/status`
  - `filters/tasks/status`
  - `filters/users`
  - `filters/project_groups`
  - `filters/project_users`
  - `search/clients`
  - `search/projects`
  - `search/time_entries`
- 官方明确行为
  - `filters/*` 与 `search/*` 返回不同粒度对象
  - 例如 `filters/clients` 只返回 ID 和名称
  - `search/projects` 支持分页语义，`page_size` 默认值可被公开观察
- 证据强度
  - 中强：官方 docs + OpenAPI

## 明确写死的官方行为

以下行为是官方公开资料已经明确写死的，不应被 OpenToggl 自行弱化：

- detailed 使用 `X-Next-ID` / `X-Next-Row-Number` 分页
- shared report 的 public/private 权限模型
- saved/shared report 无参数时回落到 saved/default 参数
- 大报表导出存在公开错误语义
- `402` 在 reports 中代表 workspace 未开通该能力
- rounding / rounding_minutes 是正式公开参数，不只是内部实现细节

## 主要空白区

以下内容官方公开资料没有完全写透，OpenToggl 需要在兼容实现时补内规则，但不能假装官方已明示：

- 费率优先级的最终细则
- 聚合前舍入还是聚合后舍入的精确差异
- freshness 的具体秒级窗口
- 大导出何时转异步的阈值
- insights / profitability 的全部计算细节

## 核心原则

### 1. 报表结果兼容优先于内部计算路径一致

- OpenToggl 可以使用自己的投影和分析存储。
- 但对外报表结果、过滤行为、导出和共享语义必须兼容。

### 2. 报表是读模型，不是 OLTP 直查合同

- PRD 允许内部采用异步投影。
- 但必须显式定义 freshness 语义，而不是假装所有查询都是强一致。

### 3. 权限裁剪属于报表合同的一部分

- 权限不是 UI 层后处理。
- 报表、共享报表、过滤器和导出都必须遵守同一可见性模型。

## 结果语义

### Detailed Reports

至少应兼容：

- time entry 行级展开
- 时间范围过滤
- user / client / project / task / tag / description 等过滤
- 分页和排序
- totals 与结果行的对应关系
- PDF / CSV / XLSX 导出

默认规则：

- detailed report 以时间记录事实为主，不应再生成第二套与 Track 不可对齐的“解释性行项”。
- 归档对象、空项目、空标签、跨日记录都必须按兼容方式表达。

官方当前还明确：

- detailed report 支持通过 `X-Next-ID` 与 `X-Next-Row-Number` 分页
- detailed export 参数可携带 `enrich_response`
- PDF 导出还包含 `time data display mode` 之类的显示语义参数
- detailed 查询本身还公开暴露了：
  - `grouped`
  - `granularity`
  - `resolution`
  - `withInlineRates`
  - `with_graph`
- detailed 公开错误语义至少包括：
  - `400`：至少要提供一个参数、workspace 非法、参数值非法
  - `402`：workspace 未开通该能力
  - `403`：workspace 不存在或不可访问

### Summary Reports

至少应兼容：

- 按 user / client / project / task 等维度聚合
- duration 聚合
- billable / non-billable totals
- revenue / cost / profit 相关聚合
- totals 与 breakdown

默认规则：

- summary 是对同一事实基础的聚合视图。
- summary 结果必须可回溯到 detailed 的事实基础。

官方当前还明确 summary 额外公开了更偏业务展示的控制参数，例如：

- `collapse`
- `distinguish_rates`
- `hide_amounts`
- `hide_rates`
- `include_time_entry_ids`
- `order_by`
- `order_dir`
- `sub_grouping`
- `audit`

其中 `audit` 还包含进一步的 group filter 结构，例如金额、duration、currency 过滤和 empty groups 行为。

这说明 summary 并不是简单 totals 接口，而是一种高可配置的聚合查询合同。

### Weekly Reports

至少应兼容：

- 周维度分桶
- 周视图 totals
- 周报导出

默认规则：

- weekly 的切周规则由工作区/用户时间语义决定。
- 跨日、跨周记录的归属必须有固定兼容规则。

官方 docs 当前显示 weekly report 的过滤参数与其他报表同样丰富，并明确包含 `rounding`、`rounding_minutes`、`billable` 等字段。

### Trends / Profitability / Insights

至少应兼容：

- 时间序列趋势
- client / project 维度趋势
- profitability
- insights

默认规则：

- profitability 不是 UI 计算，而是公开合同。
- 成员费率、项目费率、billable、currency、fixed_fee 对结果有正式影响。

## 统计口径优先级

这一节是合同核心。

### 时间口径

- 统一以时间记录事实为源。
- 存储与内部计算可以 UTC 为主。
- 对外切日、切周、展示和聚合必须遵守兼容时区语义。

### 舍入口径

- `rounding` 与 `rounding_minutes` 属于公开业务语义。
- 舍入影响不仅是 UI 显示，还可能影响聚合和导出。
- 如果官方兼容语义要求聚合前舍入或聚合后舍入，必须固定，不允许报表间自相矛盾。

### 费率口径

至少要处理：

- workspace 默认费率
- project rate
- user/member rate
- billable
- fixed fee
- currency

默认规则：

- 不同费率来源同时存在时，必须有固定优先级。
- 该优先级后续应在更细矩阵中补充，但本合同先要求“优先级必须唯一且跨报表一致”。

### 权限口径

- 权限裁剪应在报表结果形成前就纳入合同。
- shared reports 的权限语义不能与普通 reports 分裂。

## Freshness 与重建语义

### Freshness

必须明确定义：

- 报表是否允许投影延迟
- 查询结果与最新写入之间允许的延迟窗口
- 导出是否使用相同读模型

当前默认原则：

- 可以接受近实时，而不是强一致。
- 但同一版本必须给出统一 freshness 语义，不能让不同报表表现随实现漂移。

### 重建与回填

必须支持以下合同语义：

- 历史数据修正后，报表可重建
- import 后，analytics 投影可重建
- 回填不会产生与 Track 事实永久分叉的结果

## 导出合同

### 导出类型

- CSV
- PDF
- XLSX

### 默认规则

- 导出内容必须与查询条件一致。
- 导出和在线报表在同一口径下解释同一事实。
- 超大报表可以异步，但“何时异步、如何失败、如何重试”必须固定。

官方当前至少已经把“报表过大无法导出”做成了公开错误语义，因此 OpenToggl 也需要把这类边界视为兼容合同的一部分，而不是内部异常。

## 共享报表合同

### Saved Reports

- 保存的是查询定义，不是静态快照。
- 默认参数与运行时参数的合并规则必须固定。

官方当前明确：

- saved/shared report 可以在无参数调用时直接使用 saved/default 参数
- shared report 访问控制本身就是公开合同，不是 UI 私有逻辑
- saved/shared report 的错误语义也有公开约束，例如：
  - `400`：`report_type does not exist in params`
  - `400`：`The report period is not supported`
  - `401`：认证信息缺失或用户名密码错误
  - `403`：token 无效，或 report owner 不再活跃于该 workspace
  - `404`：not found

### Shared Reports

- public / private 访问语义必须固定。
- 共享导出权限与在线查看权限必须自洽。

官方当前明确：

- public report 可被任何人访问
- private report 仅 owner 或 workspace admin 可访问
- shared report 支持在线读取与 CSV/PDF/XLSX 导出

## 待确认项

- 费率优先级的精确细则
- shared reports 的部分边界行为
- 超大导出的精确阈值与任务状态模型
- profitability / insights 的个别计算细节

## 与 PRD 的关系

该文档用于支撑 `docs/prd.md` 中 Reports API v3 章节。

逐端点矩阵见 `docs/reports-endpoint-matrix.md`。
