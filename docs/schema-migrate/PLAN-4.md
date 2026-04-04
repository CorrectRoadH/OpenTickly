**需求**: [GOALS.md](GOALS.md)
**限制**: [LIMITS.md](LIMITS.md)

---

## 实现方案 4

### 简述

- 使用 `tern`（pgx 原生 migration runner）+ baseline + 内置 migrate runner，解决版本化迁移、复杂 DDL/数据迁移、self-hosting/Docker/单二进制交付和当前 schema 快照需求。与 PLAN-1（goose）解决同一组问题，核心区别是 tern 直接使用 `*pgx.Conn`（OpenToggl 已用的驱动）且内置 advisory lock。

---

## 核心设计

### 真相源划分

与 PLAN-1 相同：

- **生产真相源**：版本化 migration 文件
- **当前结构快照**：`latest.sql`

### 建议目录

```text
apps/backend/db/migrations/
  001_baseline.sql
  002_...
  003_...

apps/backend/db/schema/
  latest.sql
```

### 与 PLAN-1 的关键差异

| 维度 | PLAN-1（goose） | PLAN-4（tern） |
|------|----------------|----------------|
| 数据库驱动 | `database/sql` 或需要 pgx 适配层 | 直接接受 `*pgx.Conn`，零适配 |
| advisory lock | 不内置，需要自己在 migrate 前后加 `pg_advisory_lock/unlock` | 内置，自动在 migrate 前获取、完成后释放 |
| Go migration | `goose.AddMigrationNoTxContext` 注册 Go 函数 | `UpFunc`/`DownFunc` 回调，接收的是 `*pgx.Conn` |
| migration 文件格式 | SQL 文件 + Go 文件，数字前缀排序 | SQL 文件（支持 `tern` 模板语法），Go 回调通过代码注册 |
| embed 支持 | `embed.FS` | `fs.FS`（兼容 `embed.FS`） |
| 社区规模 | 更大（5k+ stars），文档更多 | 更小（~900 stars），文档更少，但作者是 pgx 作者 jackc |
| 版本表 | `goose_db_version` | `public.schema_version`（可配置） |
| 模板语法 | 无 | 支持 Go template 语法，可在 SQL migration 中使用条件逻辑 |

### 集成方式

tern 作为 Go library 集成到 OpenToggl 二进制中：

```go
import (
    "embed"
    "github.com/jackc/tern/v2/migrate"
    "github.com/jackc/pgx/v5"
)

//go:embed db/migrations/*.sql
var migrationFS embed.FS

func runMigrations(conn *pgx.Conn) error {
    migrator, err := migrate.NewMigrator(ctx, conn, "schema_version")
    if err != nil {
        return err
    }
    err = migrator.LoadMigrations(migrationFS)
    if err != nil {
        return err
    }
    return migrator.Migrate(ctx) // 内置 advisory lock
}
```

与 goose 的集成对比：goose 需要传入 `*sql.DB` 或通过 pgx stdlib adapter 桥接，tern 直接用现有的 `*pgx.Conn`。

### 初始化与升级

- 新库：通过 baseline migration 快速初始化（001_baseline.sql 包含完整当前 schema）
- 老库：`migrator.Migrate(ctx)` 执行未完成 migrations
- 生产库中 `schema_version` 表记录 migration 历史
- 多副本部署时 tern 自动通过 advisory lock 协调，只有一个实例执行 migrate

当前升级支持边界需要明确收口：

- 正式支持从 `v0.0.17` 的现状 schema 迁移到新 migration 体系
- `v0.0.17` 是旧世界到新 migration 世界的受支持桥接起点
- 早于 `v0.0.17` 的历史版本不承诺自动升级；如果未来需要支持，必须单独补桥接 migration 和验证证据

### self-hosting 形态

与 PLAN-1 相同：

- Docker 镜像内只需要 OpenToggl 后端二进制
- 不再依赖外部 `pgschema` CLI
- 正式版单二进制启动时，应用自动检查并执行 pending migrations，再进入服务就绪流程
- 用户不需要显式调用独立 migrate 命令；启动程序本身就是正式 migration 入口
- migration 正确性由开发期、本地测试、CI 和发布验证保证，而不是转嫁给最终操作者手工执行

### 复杂迁移策略

与 PLAN-1 相同：

- 简单 DDL：SQL migration
- 小规模数据回填：SQL migration
- 大规模或复杂数据迁移：Go migration（通过 `UpFunc` 注册，接收 `*pgx.Conn`）
- 破坏性变更默认走 expand / contract

### 各类变更如何产生 schema 与 migration

与 PLAN-1 完全相同，不再重复。参见 [PLAN-1.md §各类变更如何产生 schema 与 migration](PLAN-1.md)。

### `latest.sql` 的产生规则

与 PLAN-1 相同。参见 [PLAN-1.md §latest.sql 的产生规则](PLAN-1.md)。

### 数据回填的基本规则

与 PLAN-1 相同。参见 [PLAN-1.md §数据回填的基本规则](PLAN-1.md)。

---

## 已触发痛点的解决方式

与 PLAN-1 相同——tern 和 goose 在 migration 文件层面的表达能力一致，都是显式 SQL + 可选 Go migration。具体示例参见 [PLAN-1.md §已触发痛点的解决方式](PLAN-1.md)。

唯一区别：Go migration 中 tern 的回调直接拿到 `*pgx.Conn`，可以用 pgx 的 `CopyFrom`、`SendBatch` 等高性能 API 做大批量数据迁移，不需要经过 `database/sql` 适配层。

---

## 优势

- **满足 GOALS 中的所有需求**：与 PLAN-1 相同，覆盖单一 schema 真相源、复杂迁移、self-hosting、版本化、测试路径一致、前向修复
- **零驱动适配**：OpenToggl 已经用 pgx v5，tern 直接接受 `*pgx.Conn`，不需要引入 `database/sql` 桥接层或 pgx stdlib adapter
- **内置 advisory lock**：多副本部署开箱安全，不需要自己在 migrate 代码外层包装锁逻辑
- **Go migration 更自然**：`UpFunc` 回调拿到的就是 pgx conn，可以直接用项目里现有的 pgx 查询模式，不需要学另一套 API
- **模板语法**：SQL migration 中可以用 Go template 做条件逻辑（如 `{{ if .IsDev }}` 跳过某些步骤），对 dev/prod 分支场景有用
- **依赖更轻**：tern 本身很小，传递依赖少

---

## 缺点

- **社区更小**：对应 [LIMITS.md](LIMITS.md) 里 tern 的社区规模限制，goose 的文档、issue 解答、第三方集成示例都更多
- **流程比现在重**：与 PLAN-1 相同，开发者不再只改一份 `schema.sql`
- **要维护快照文件**：与 PLAN-1 相同，`latest.sql` 需要手动同步
- **不是自动化银弹**：与 PLAN-1 相同，大表回填和兼容窗口仍需团队手工设计
- **需要一次性切换成本**：与 PLAN-1 相同，pgschema 耦合的地方都要改
- **模板语法是双刃剑**：如果滥用，SQL migration 的可读性会下降
- **内置 runner 仍需自己补齐运维语义**：tern 只解决 migration 执行器本身，不会自动替 OpenToggl 定义 baseline、upgrade、failure reporting、status 查询、pending migration 展示、CI 校验和 `latest.sql` 漂移检测
- **内置 advisory lock 不是决定性优势**：它能减少一层额外封装，但锁本身不是迁移体系最难的问题，不能高估为核心选型依据
- **pgx 原生集成也会带来更强耦合**：Go migration 直接拿 `*pgx.Conn` 虽然顺手，但也更容易把历史 migration 写成依赖当前项目实现习惯的代码，增加未来重构时的兼容风险
- **Go migration 需要严格边界**：如果 migration 代码直接依赖当前 application/domain 实现，历史 migration 会随着业务代码演进而失稳；tern 不会自动防止这种腐化
- **`latest.sql` 漂移风险仍然存在**：如果没有 CI 或生成校验，migration 真相源和 current-state 快照很容易长期分叉，形成第二真相源
- **baseline 策略需要额外治理**：何时重切 baseline、老环境永远不走 baseline 还是允许按版本切换、baseline 和后续 migration 的边界如何保持清晰，文档和工具都不会替团队自动决定
- **启动时跑 migration 的边界需要单独规定**：单二进制和 entrypoint 可执行 migrate，不代表所有 migration 都适合绑在启动前；长回填、高风险迁移、需要人工观察的步骤仍需拆到独立命令或后台 job

---

## 与 PLAN-1 的选择判断

PLAN-1 和 PLAN-4 解决的问题完全相同，区别在工程适配度：

- 选 **PLAN-1（goose）** 如果：更看重社区规模、文档丰富度、遇到问题时能 Google 到答案
- 选 **PLAN-4（tern）** 如果：更看重与现有 pgx 技术栈的零摩擦集成、内置 advisory lock、更轻的依赖

但需要明确：

- 两者在 migration 文件层面的表达能力基本一致，差异主要在集成方式和生态成熟度
- `PLAN-4` 的优势更多是工程适配度，不是能力代差
- 如果团队更担心自定义 runner 约束失控、历史 migration 腐化、或后续维护时缺少现成经验，`PLAN-1` 反而可能更稳

---

## 必须先定义的治理规则

如果选择 PLAN-4，不能只引入 tern 和 migration 目录，还必须先把以下规则定死。

### 1. runner 边界规则

- 应用内置 migration runner 必须是唯一正式 migration 执行边界
- 正式版 `serve` 启动时自动检查并执行 pending migrations，这必须是统一的正式行为，不能在不同运行形态里各自漂移
- 启动日志或诊断输出必须至少包含：当前版本、待执行 migration、执行结果、失败位置
- 必须有正式的 `status` 能力，能回答数据库当前处于哪个版本、还有哪些 pending migration

### 2. baseline 规则

- baseline 只服务新库初始化，不服务已有环境升级
- 老环境升级必须只走增量 migration，不能在中途回到 baseline 路径
- 何时允许重切 baseline 必须有明确规则，例如只允许在正式发布节点或大版本切换时重切
- 每次重切 baseline 时，必须重新验证从空库到当前版本的完整初始化路径
- 支持的旧版本升级起点必须明确写死；当前桥接起点定义为 `v0.0.17`，更早版本默认不支持

### 3. `latest.sql` 规则

- migration 文件是执行真相源，`latest.sql` 只是当前结构快照
- `latest.sql` 必须由受控流程生成或校验，不能完全依赖人工同步
- CI 必须校验 `latest.sql` 与 migration 执行后的最终结构一致
- 如果两者不一致，合并必须失败，不能接受“先 merge 再补快照”

### 4. Go migration 边界规则

- Go migration 不允许依赖 application、domain、transport 的当前实现
- Go migration 只能依赖稳定的 migration helper、raw SQL、以及受控的 pgx 访问层
- 历史 migration 必须做到：未来删除业务模块、重构 service、调整 domain model 后仍然可编译、可执行
- Go migration 只用于确实需要分批、重试、观测或复杂转换的场景；简单结构变更默认仍用 SQL migration

### 5. 启动前执行规则

- 正式版应用启动时必须自动检查并执行 pending migrations，这包括长时间 migration；自动化是正式要求，不依赖操作者手工介入
- 但长时间 migration 不能被写成“不可观测的黑盒启动卡死”；必须有阶段、进度、失败位置和恢复语义
- 需要长时间运行的 backfill 或数据转换，必须设计为可恢复、可重试、可判断当前阶段，而不是一次性不可中断的大事务
- 如果某类迁移会显著延长启动时间，也必须在日志、状态输出或运维文档中明确暴露，而不是静默等待
- self-hosted 文档必须明确：正式版启动会自动执行哪些迁移、长时间迁移期间实例表现为何、失败后如何恢复

### 6. review 规则

- 每次 schema 变更必须同时提交：migration 文件、`latest.sql` 更新、以及必要的 rollout/compat 说明
- 破坏性变更必须明确标注是“数据不保留”还是“数据保留”
- 涉及 expand/contract 的变更，必须在 review 中写清楚阶段边界，不能只提交最终 schema 结果
- 不能接受“先手工改库，再让仓库追认”的流程

### 7. 测试与验证规则

- CI 必须至少验证：空库初始化、已有库升级、`latest.sql` 一致性
- 涉及复杂迁移时，测试必须覆盖真实迁移路径，而不是只验证最终 schema
- startup smoke 必须走正式版应用启动自动检查/自动执行 migration 的正式路径，而不是测试专用旁路
- self-hosted 单二进制路径必须有独立验证证据，不能只拿本地开发路径替代
- 已有库升级验证至少要覆盖：`v0.0.17` 现状 -> 当前版本；更早版本如果不支持，应在文档中明确声明而不是隐含假设

### 8. 回滚与前向修复规则

- 默认采用 forward-only；down migration 不作为生产主回滚方案
- 高风险 migration 必须在设计阶段写明前向修复策略
- 如果某个变更需要兼容窗口、双写、分批回填或人工观察，必须拆阶段；即使这些阶段由启动自动触发，也必须有明确阶段边界和恢复语义
- 迁移失败后的恢复路径必须能回答：数据库停在第几步、是否可重试、是否需要人工介入

这些规则不是“后面再补的文档细节”，而是 PLAN-4 能否成立的前提条件。

---

## 结论

tern 是 PLAN-1 的同类替代，核心差异是技术栈亲和度：pgx 原生 conn、内置 advisory lock、更轻的依赖。适合 OpenToggl 这种"已经全栈 pgx、需要单二进制内置 migrate"的项目形态。

当前版本支持边界建议明确写为：

- 支持空库初始化
- 支持从 `v0.0.17` 的现状升级
- `v0.0.17` 之前的历史版本暂不承诺自动升级
