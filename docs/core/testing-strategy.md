# OpenToggl 测试策略

本文档定义测试分层、目录与最低覆盖要求，回答：

- 前端、后端、合同、异步运行时分别怎么测
- 哪些能力必须有单测，哪些必须有集成测，哪些必须走 e2e
- 新模块、新页面、新合同上线前最低要补哪些测试
- 测试应该从哪里出发设计，如何作为真实验收依据

测试策略服务于架构，不单独定义产品语义；产品语义仍以 `product/`、`openapi/` 和必要的专题文档为准。

由于本项目没有依赖人工 QA 或产品验收的稳定流程，测试本身就是主要验收机制。

因此本文档额外定义两条硬约束：

- 仓库内不允许存在“留给以后再优化”的慢测试类别。
- 默认开发门禁就是全量测试门禁；`pre-commit` 前必须能在本地快速跑完整套测试并给出足够信心。

当前 OpenAPI 来源分为：

- Toggl compat：`toggl-track-api-v9.swagger.json`、`toggl-reports-v3.swagger.json`、`toggl-webhooks-v1.swagger.json`
- OpenToggl 自定义：`opentoggl-web.openapi.json`、`opentoggl-import.openapi.json`、`opentoggl-admin.openapi.json`

其中后 3 份是目标态，应在对应产品面实现前补齐。

## 0. 测试设计起点

测试设计的主起点不是 OpenAPI，而是 `docs/product/*.md` 中定义的用户故事。

但这只定义验收测试主线，不意味着所有测试都必须直接绑定某条完整用户故事。

固定顺序：

1. 先读 `docs/core/product-definition.md`
2. 再读对应 `docs/product/*.md`
3. 从 PRD 中抽取用户故事、目标、关键约束、失败场景
4. 再把这些用户故事映射到 unit / integration / page flow / e2e / contract / golden
5. 最后才用 `openapi/*.json` 校验 compat 合同没有漂移

结论：

- PRD 定义“为什么测、测什么目标”。
- 用户故事定义“如何验收是否真的完成”。
- TDD、bugfix、边界条件与回归保护测试定义“哪些具体规则以后不能再坏”。
- OpenAPI 定义“公开接口有没有偏离兼容合同”。

不允许把测试设计退化成“按 endpoint 清单补测试”。

## 1. 测试原则

### 1.1 测试即验收

- 对于 OpenToggl，测试不是补充材料，而是结果验收本体。
- 任何宣称“已兼容”“已实现”“可发布”的结论，都应能被测试直接支撑，而不是依赖人工走查。
- 对 Toggl 兼容面的验收，优先通过用户故事驱动的 page flow test、e2e、application integration，再辅以 contract test 与 golden test 完成。

下列情况属于“假绿”，不能据此宣称完成：

- OpenAPI / schema / contract test 通过，但 real-runtime page flow 或 e2e 失败
- 单测覆盖了 mapper / formatter / hook，但对应用户故事没有 page flow 或 e2e 支撑
- mock server 下流程通过，但真实路由、真实后端、真实浏览器路径没有验证
- 页面可以提交数据，但没有对应 Figma/fallback 对齐证据，或仍停留在占位页骨架
- 只证明 endpoint shape 对了，却没有证明用户目标达成

### 1.2 全量测试必须快

- 仓库内不允许保留慢测试。
- `pre-commit` 前默认跑全量测试，而不是只跑一个快速子集。
- 全量测试总时长目标是 `<= 30s`。
- 如果新增测试让全量测试突破该预算，优先重构测试设计、fixture、并行方式或实现结构，而不是下调门禁。

### 1.3 少 mock，优先真实依赖

- 默认避免 mock。
- 纯业务规则直接做 domain unit test。
- 涉及数据库、路由、URL state、query cache、后台 job 的测试，优先使用真实依赖与真实集成边界。
- 只有外部不可控系统边界才允许 fake / stub，例如第三方 webhook endpoint、支付 provider、邮件 provider。
- 不允许用 mock 重演 SQL、HTTP handler 内部调用顺序或 query cache 细节。

### 1.4 仍保持分层

默认比例仍然是：

- 多数测试是纯单元或小范围组件测试
- 关键用例有应用层集成测试
- 公开合同有 transport contract test
- 少量高价值完整流程走 e2e

禁止把所有信心都压在 e2e 上。

但这里的“少量”不等于“慢”或“稀有”；e2e 也属于日常全量门禁的一部分。

### 1.5 用户故事优先

- 验收测试应能回答“它服务于哪条用户故事”。
- 测试套件的主组织方式优先围绕用户目标，而不是围绕 transport endpoint 列表。
- 先证明用户目标成立，再证明公开合同一致。
- 但并非所有测试都必须直接绑定用户故事；TDD 与回归测试可以绑定具体规则、缺陷或边界条件。

用户故事至少应包含：

- 角色
- 目标
- 成功结果
- 关键约束
- 主要失败分支

示例：

- 用户进入 workspace 后，可以启动 timer，并在 `calendar | list | timesheet` 中持续看到一致的运行中状态；停止后生成符合 Toggl 语义的 time entry。
- 管理员创建 webhook subscription 后，可以完成基础验证，并在状态页看到最近投递结果。
- 用户导入最小 Toggl 样本后，可以看到导入结果反馈，并在主要 tracking 视图中看到对应数据。

### 1.6 TDD 与回归测试同样是正式组成部分

- 开发过程中允许也鼓励先写更细粒度的测试，再写实现。
- 修复 bug 时，必须优先补一条能复现该缺陷的回归测试。
- 这类测试不要求强行映射到完整用户故事，但必须能说明它保护的具体规则。

典型合法来源：

- domain invariant
- 边界条件
- 权限拒绝
- 并发 / 幂等 / 重试
- 历史缺陷回归
- 某个 command / query / mapper / formatter 的精确定义

要求：

- 没有用户故事归属的测试，也必须能回答“它在保护什么具体行为”。
- 不允许写只证明实现细节、却不保护任何外部行为或业务规则的脆弱测试。

## 2. 测试矩阵

| 层级                    | 目标                                       | 位置                                                           | 关注点                         |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------- | ------------------------------ |
| Domain Unit             | 不变量与值对象                             | `apps/backend/internal/<context>/domain/*_test.go`             | 纯业务规则                     |
| Application Integration | 用例、事务、权限、job record               | `apps/backend/internal/<context>/application/*_integration_test.go` | command/query 编排         |
| Transport Contract      | 公开 API 与错误语义                        | `apps/backend/tests/compat/**`                                 | 路径、字段、状态码、错误映射   |
| Async Runtime           | projector / delivery / import continuation | `apps/backend/internal/<context>/infra/**/*_job_test.go`       | 幂等、重试、失败恢复           |
| Frontend Unit           | formatter、mapper、helper                  | `apps/website/src/**/__tests__/*`                              | 纯函数与映射                   |
| Frontend Feature        | 组件交互与 mutation 行为                   | `apps/website/src/features/**/__tests__/*`                     | 提交、错误、状态切换           |
| Frontend Page Flow      | 页面族与 URL/query 协同                    | `apps/website/src/pages/**/__tests__/*`                        | route、search params、视图切换 |
| E2E                     | 高价值跨层流程                             | `apps/website/e2e/**`                                          | 用户关键路径                   |
| Compatibility Golden    | Toggl 兼容基线                             | `apps/backend/tests/golden/**`                                 | JSON shape、导出/报表基线      |

## 2.1 用户故事到测试分层映射

每条高价值用户故事都应拆成一组验收测试，而不是只写一层：

- `Domain Unit`
  - 证明故事依赖的核心规则和不变量成立
- `Application Integration`
  - 证明故事中的事务、权限、副作用、job record、查询语义成立
- `Frontend Feature / Page Flow`
  - 证明用户在页面上的动作流、URL state、query/state 装配成立
- `E2E`
  - 证明整条用户故事在真实应用路径中走通
- `Transport Contract`
  - 证明故事涉及的公开接口没有偏离 compat 合同
- `Compatibility Golden`
  - 证明公开输出 shape、导出格式或 payload 风格与承诺基线一致

要求：

- 高价值用户故事不能只落在 contract test。
- compat API 不能只有 endpoint 覆盖，而没有故事驱动的验收链路。
- 同一用户故事允许多个接口参与，但测试关注点始终是目标是否达成，而不是接口数是否覆盖齐全。

除此之外，还允许独立补充非故事型测试：

- TDD 细粒度设计测试
- bug regression test
- 规则边界测试
- 并发 / 幂等 / 重试保护测试

这些测试不替代用户故事验收链路，但它们是稳定性防线的一部分。

## 2.2 完成判定与失败门禁

一个能力只有在以下条件同时成立时，才算通过测试 gate：

- 对应用户故事已有明确映射
- 关键 domain / integration / contract 覆盖已存在
- 对应正式页面族已有 page flow test
- 至少一条高价值真实流程已有 e2e 或 real-runtime 验证
- 相关 root-level 检查命令通过，不能依赖“部分子集是绿的”

以下情况必须视为阻塞，而不是“后续再补”：

- root `test`、root `check`、关键 smoke 或 real-runtime e2e 失败
- 只有 contract / golden，没有 page flow / e2e
- 只有 mocked browser flow，没有真实 runtime 验证
- 测试缺口已知存在，但没有在 stories 清单中被明确记录和降级批准

## 2.5 执行模型与时长预算

全量测试必须并行执行，并按下列思路设计：

- 后端 unit / integration / job test 可并发跑，不允许串行依赖共享脏状态。
- 前端 unit / feature / page flow 必须可并发跑，且每个测试文件应可独立启动。
- contract test 与 golden test 必须可批量并发，不依赖人工准备环境。
- e2e 必须默认并行跑，不允许把浏览器测试设计成串行长流程。

建议预算：

- 后端 domain + application + async runtime：`<= 8s`
- transport contract + golden：`<= 8s`
- 前端 unit + feature + page flow：`<= 8s`
- e2e 全量并行：`<= 6s`
- 总预算：`<= 30s`

这里是门禁预算，不是理想值；超过预算就属于测试设计问题。

## 3. 后端测试规则

### 3.1 Domain Unit

必须覆盖：

- entity invariant
- value object 校验与比较
- domain error 分支
- 时间、金额、duration、filter 这类核心值对象

不应该：

- 连数据库
- 依赖 HTTP
- 依赖 provider

### 3.2 Application Integration

必须覆盖：

- command 的事务边界
- 权限拒绝
- feature gate 拒绝
- 成功写入后的 audit / job record
- query 的主要过滤与分页语义

建议：

- 使用真实 Postgres 测试库或等价集成环境
- 每个测试优先使用事务回滚或等价隔离，而不是重复建库
- fixture 只保留最小可运行数据集
- 不用 mock 重演 SQL 细节

### 3.3 Transport Contract

必须覆盖：

- 路径、方法、鉴权入口
- 请求参数校验
- 响应字段 shape
- 错误码与错误 body
- 兼容接口与 Web 接口的差异

来源规则：

- Toggl compat API 的 contract test 以对应用户故事或明确规则为入口，以 `toggl-*` OpenAPI 为合同校验来源
- OpenToggl 自定义接口的 contract test 以 `opentoggl-web`、`opentoggl-import`、`opentoggl-admin` 为输入来源
- 如果存在 golden 样本，golden 必须与 OpenAPI 和公开行为同时一致
- OpenAPI 只用于合同校验，不作为测试设计主起点
- 测试可以由 OpenAPI 生成 skeleton，但只能作为辅助；断言语义与场景选择必须由 PRD 用户故事或明确规则驱动

优先级最高的合同测试包括：

- time entries
- running timer
- projects / clients / tasks / tags
- reports 关键查询
- webhook subscription / validate / ping / status
- importing 入口与结果回报

### 3.4 Async Runtime

必须覆盖：

- job 幂等
- retry / backoff / dead-letter 或最终失败状态
- projector 增量刷新与重建
- webhook delivery record 持久化
- import continuation 与部分失败恢复

速度要求：

- job 测试必须在进程内跑完，不依赖独立 worker 部署
- retry / backoff 测试应使用可控时钟或同步调度推进，不允许真实等待秒级时间
- 幂等与恢复测试必须用最小批次数据验证，不允许导入大样本拖慢门禁

## 4. 前端测试规则

### 4.1 Frontend Unit

必须覆盖：

- 日期、时长、金额格式化
- DTO -> view model mapper
- filter / URL adapter
- 表单 schema adapter

### 4.2 Feature Test

必须覆盖高价值 feature：

- start / stop timer
- create / edit time entry
- bulk update
- create / archive project
- webhook subscription create / validate

关注点：

- 成功与失败状态
- mutation 后 query 更新
- modal / drawer / inline edit 的交互流程

规则：

- 使用真实 router、真实 query client、真实 form schema
- 不要把 feature test 写成伪 e2e；只覆盖一个明确动作流
- 测试应直接复用页面真实使用的 adapter，而不是额外包一层测试专用调用链

### 4.3 Page Flow Test

必须覆盖正式页面族：

- `timer` 页面族：`calendar | list | timesheet`
- `project page`
- `client page`
- `profile`
- `settings`
- `integrations webhooks`

关注点：

- URL state 是否真实落地址栏
- 不同视图是否共享同一筛选条件与事实来源
- 页面装配是否能正确组合 feature 与 entity

规则：

- 必须使用真实路由配置与 search params schema
- 页面流测试要覆盖 route enter / reload / back-forward 后的状态一致性
- 不允许靠手写 mock URL adapter 来证明页面行为正确

## 5. E2E 覆盖边界

E2E 设计原则：

- e2e 不是只在 CI 运行的慢测试；它是日常门禁的一部分。
- e2e 必须全部并行执行。
- 每条 e2e 只验证一条高价值用户路径，不串联无关能力。
- e2e 必须使用最小启动成本：单次 app 启动、最小 seed、轻量登录准备、单浏览器多 context 或等价方案。
- 不允许为了图省事写“一个超长 happy path 覆盖所有功能”的巨型用例。
- 每条 e2e 都应能映射回一条清晰的 PRD 用户故事。

以下能力必须有 e2e：

- 登录后进入 workspace，启动并停止 timer
- 在 `calendar/list/timesheet` 间切换且状态不丢失
- 创建 project 并在 timer 流中可见
- webhook subscription 创建与基础验证流程
- 导入一个最小样本并看到结果反馈

以下能力不应只靠 e2e：

- domain invariant
- API 错误码矩阵
- 报表聚合边界条件
- job 幂等与重试逻辑

速度约束：

- 单条 e2e 应在秒级完成。
- 登录、建 workspace、基础数据准备应复用统一快速入口，避免每条用例重复重建大数据集。
- 如需等待异步结果，优先等待可观测状态，不允许使用拍脑袋的长 sleep。

## 6. Compatibility Golden Tests

凡是明确承诺对齐 Toggl 的公开输出，优先增加 golden test。

适用场景：

- compat API JSON shape
- 报表导出列顺序与字段命名
- webhook payload 样式
- import 结果回报

定位：

- golden test 用来锁定兼容输出，不用来替代用户故事验收。
- golden 负责证明“输出没有漂”，不负责单独证明“用户目标已经实现”。

规则：

- golden 样本必须标注来源，对应 `openapi/*.json`、上游证据或专题规则
- 合同来源变更时，先更新来源文档，再更新 golden
- 不允许为了让测试通过而静默改写公开字段语义
- golden 样本应尽量小而有代表性，避免用庞大样本拖慢门禁

## 6.5 OpenAPI 在测试中的作用

OpenAPI 的职责是合同校验，不是测试设计起点。

对于 compat API，允许由 OpenAPI 生成：

- contract test skeleton
- request validation cases
- response shape smoke cases
- endpoint 覆盖清单

但必须由 PRD / 用户故事或明确规则补齐真正的验收语义：

- 用户目标达成场景
- 关键失败路径
- 权限场景
- feature gate 场景
- 业务不变量场景
- golden 样本的关键断言

因此流程固定为：

1. 从 PRD 抽取用户故事
2. 以用户故事设计验收链路
3. 对细粒度规则、缺陷和边界补充 TDD / 回归测试
4. 用 OpenAPI 校验公开合同

不允许反过来从 OpenAPI 清单出发拼凑“看起来很多”的测试。

## 7. 目录与命名规则

后端：

- 单测：`*_test.go`
- 集成测：`*_integration_test.go`
- job/runtime 测试：`*_job_test.go`

前端：

- 单元/组件测试：`__tests__/xxx.test.ts`
- e2e：`apps/website/e2e/*.spec.ts`

当前仓库的真实前端目录是 `apps/website`，测试目录也应先以它为准。

## 7.5 数据与环境规则

- 测试数据应以最小样本为默认，不允许为了“更真实”引入大而慢的 seed。
- 测试环境应尽量贴近真实运行时，但必须可重复、可并行、可快速清理。
- 数据库类测试优先使用一次初始化、多测试复用、按测试隔离回滚的方式。
- 外部依赖应使用本地可控替身或进程内 fake server，但只限真实系统边界，不伪造内部模块。
- 测试通过所需的环境变量必须保持最少；不允许为了测试层层增加临时 env 开关。

## 7.6 建议门禁顺序

虽然门禁本身是全量测试，但执行上应优先早失败：

1. 静态检查与类型检查
2. 后端 domain / application / async runtime
3. 前端 unit / feature / page flow
4. contract + golden
5. e2e

如果工具支持，应并行调度而不是机械串行；这里表达的是失败优先级，不要求顺序阻塞。

## 8. 最低发布门槛

新能力合入前，最低要求：

- 对应层级的单测或组件测试已补齐
- 有至少一条覆盖主成功路径的集成测试或页面流测试
- 如果暴露公开 API，已有合同测试
- 如果是 compat API，测试来源已明确对齐 `openapi/*.json`
- 如果引入异步 job，已有 job/runtime 测试
- 如果是高价值用户路径，已有 e2e
- 全量测试仍能保持在快速门禁预算内
- 已为对应 PRD 用户故事建立验收测试链路
- 新增 bug 或边界规则时，已有对应回归测试

没有人工验收兜底时，还必须满足：

- PRD 中的主要用户故事已有明确测试映射
- 兼容输出有 contract 或 golden 直接验收
- 关键交互有 page flow 或 e2e 直接验收
- 事务、副作用、权限、幂等至少有一层非 mock 测试直接验收
- 已知缺陷和高风险边界有直接回归测试保护

## 9. Review 检查项

测试 review 至少检查：

- 是否只写了 happy path
- 是否把本应单测的规则推给了 e2e
- 是否遗漏了权限、feature gate、重试、并发或幂等场景
- 是否有 Toggl 兼容输出却没有 golden / contract test
- 是否让页面测试绕过真实 URL state 或 query 行为
- 是否把“慢”当成理所当然，而不是继续压缩测试设计
- 是否为了测试方便引入过多 mock、env 开关、专用脚手架或一次性测试代码
- 是否从 PRD 用户故事出发设计验收测试，而不是从 endpoint 清单反推测试
- 是否只有合同测试，却没有对用户目标本身的验收测试
- 是否遗漏了应由 TDD 或 bugfix 补上的回归测试
- 是否存在只绑定实现细节、却没有保护业务规则或外部行为的脆弱测试
