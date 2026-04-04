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

### self-hosting 形态

与 PLAN-1 相同：

- Docker 镜像内只需要 OpenToggl 后端二进制
- 不再依赖外部 `pgschema` CLI
- entrypoint 先执行 `opentoggl migrate`，再启动服务
- 单二进制部署也能直接运行同样命令

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

---

## 与 PLAN-1 的选择判断

PLAN-1 和 PLAN-4 解决的问题完全相同，区别在工程适配度：

- 选 **PLAN-1（goose）** 如果：更看重社区规模、文档丰富度、遇到问题时能 Google 到答案
- 选 **PLAN-4（tern）** 如果：更看重与现有 pgx 技术栈的零摩擦集成、内置 advisory lock、更轻的依赖

两者在 migration 文件层面的表达能力一致，切换成本也基本相同。

---

## 结论

tern 是 PLAN-1 的同类替代，核心差异是技术栈亲和度：pgx 原生 conn、内置 advisory lock、更轻的依赖。适合 OpenToggl 这种"已经全栈 pgx、需要单二进制内置 migrate"的项目形态。
