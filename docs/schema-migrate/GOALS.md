**相关文档**:
- [LIMITS.md](LIMITS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)
- [DECISION.md](DECISION.md)

## 目标

这里记录 OpenToggl 的数据库 schema / migrate 机制需要满足的目标。
按目标组织，不写具体实现细节，不把当前代码现状误当成目标。

---

## 已触发的痛点

以下是 OpenToggl 已经遇到的、当前 desired-state apply 模型难以清晰表达迁移过程的真实案例：

### FK 目标变更 + 约束改写 + 列删除（`36ad3fc` refactor org api）

- `catalog_groups.workspace_id` FK 改成了 `organization_id` FK，旧索引全部重建
- `membership_workspace_members` 的 CHECK 约束值集合从 `owner/admin/member` 变成 `admin/member/projectlead/teamlead`
- `catalog_groups.has_users` 列被删除
- 这类 diff 往往涉及 drop/recreate、约束重建和破坏性删除；如果旧数据不兼容，执行风险高，且 code review 很难只靠最终 schema 看清迁移意图

### 表重建且不保留数据（`9a508b2` refactor onboarding）

- `onboarding_progress`（复合主键、4 列）整张表被替换成 `user_onboarding`（单列主键、3 列，完全不同的列集合）
- 这是业务重构，旧数据不需要保留，drop + create 是正确行为
- 当前 desired-state 模型可以表达最终状态，但不能天然区分"故意丢弃数据"和"遗漏了数据迁移"
- 如果某天同类表重建需要保留数据，则还需要额外机制显式表达迁移过程与保留策略

### 同名字段数据结构变化（`81abf94` refactor: eliminate unnecessary type conversions）

- 多张表的数组字段从 `jsonb` 改成了 `bigint[]`：
  - `tracking_time_entries.tag_ids`：`jsonb` → `bigint[]`
  - `tracking_time_entries.expense_ids`：`jsonb` → `bigint[]`
  - `tracking_favorites.tag_ids`：`jsonb` → `bigint[]`
  - `tracking_goals.project_ids`、`task_ids`、`tag_ids`：`jsonb` → `bigint[]`
  - `tracking_reminders.user_ids`、`group_ids`：`jsonb` → `bigint[]`
- 字段名不变，但底层存储类型完全不同，旧数据格式（`[1,2,3]` JSON array）和新类型（`{1,2,3}` pg array）不兼容
- 如果直接做原位 type change，列中已有数据时很容易失败或需要手工补充转换逻辑
- 更安全的做法通常是：加临时列 → 转换数据 → 删旧列 → 重命名新列；这说明系统需要显式表达迁移过程，而不是只表达最终状态

这些不是假设场景，而是最近 commit 历史中实际发生的问题。

---

## 需求

### 当前结构需要有稳定表达

- 仓库里需要有一种稳定、易读的“当前数据库长什么样”的表达，方便人和 AI 在开发时快速理解当前结构
- 这份当前结构表达必须能明确回答“现在有哪些表、列、索引、约束”，而不是只能靠把所有历史变更手工 replay 一遍推断
- 当前结构表达必须和正式执行路径保持一致，不能长期漂移成另一套事实来源

### 支持复杂迁移

- schema 机制必须支持复杂演进，而不是只适合“加一列、加一张表”这类简单变更
- AI 或开发者改功能时，可能会：
  - 重建整张表
  - 修改字段类型或数据结构
  - 拆分列 / 合并列
  - 增删字段、索引、约束
  - 做数据回填、清洗、兼容期迁移
- 迁移系统必须能表达“过程”，而不是只表达最终目标状态
- 复杂 DDL 和数据迁移要能受控执行、可审阅、可验证，不依赖 diff 工具在运行时临时推断

### 适配 self-hosting 交付

- self-hosted 部署路径不应要求操作者手工编排额外 schema 步骤才能完成部署
- Docker 镜像应能在应用启动前自动完成受控 schema reconcile / migrate
- 单一后端二进制必须能完成受控 schema 执行，这是正式功能需求
- 同一套机制必须同时适用于：
  - 本地开发
  - CI / startup smoke
  - Docker / compose
  - self-hosted 单二进制部署

### 版本化与可审阅

- schema 变更过程必须以受版本控制的形式存在于仓库中
- 每次数据库变更都应能在 code review 中看到“这次要对数据库做什么”，而不是只看到改完后的最终 SQL
- 生产库必须有明确的执行历史或状态记录，能够回答“当前数据库执行到了哪一步”

### 新库初始化与老库升级都要简单

- 新环境初始化应足够快、足够简单、足够可重复，不能把高成本历史 replay 作为唯一现实路径
- 新库应有明确、稳定的初始化路径
- 已有环境应能从当前版本安全升级到目标版本

### 测试路径与生产路径一致

- 测试数据库初始化不能继续走一条和生产完全不同的 schema apply 路径
- 测试环境应尽量复用真实 migration 机制，避免“测试能过、生产 migrate 失败”

### schema 变更与代码变更的联动

- OpenToggl 的 schema 到 Go 代码是 100% 手写映射（pgx + 手动 Scan），没有 ORM 或代码生成
- 一次 schema 变更会波及 4 层：infra SQL/scan → application types → application service → transport handler
- schema 执行机制必须能区分两类 schema 变更：
  - **数据不保留**：业务重构，旧表/旧列直接丢弃，review 能明确确认这是刻意行为
  - **数据保留**：字段类型变更、表重建但需要迁移数据，review 能明确看到转换过程和保留策略
- 不能只靠最终状态去猜这两类变更的意图，系统必须能显式表达意图与数据处理策略

### 前向修复优先

- 默认采用 forward-only 的数据库演进模型
- 不把 down migration 当作生产主回滚方案
- 高风险变更需要提前拆阶段、保留兼容窗口和数据恢复手段
