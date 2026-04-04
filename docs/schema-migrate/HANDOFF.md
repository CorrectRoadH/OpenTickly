**决策文档**: [DECISION.md](DECISION.md)
**实现方案**: [PLAN-1.md](PLAN-1.md)

---

## 目的

这份文档是 PLAN-1（goose）落地的执行交接文档。它把 PLAN-1 从"设计方案"翻译成"具体要改什么"，让下一个执行者可以直接开始写代码。

---

## 当前状态（要被替换的东西）

### pgschema 在代码中的触点

| 触点 | 文件 | 作用 |
|------|------|------|
| pgschema 二进制安装 | `Dockerfile:22` | `go install github.com/pgplex/pgschema@v1.7.3` |
| pgschema 二进制拷贝 | `Dockerfile:34` | `COPY --from=builder /out/pgschema /usr/local/bin/pgschema` |
| schema.sql 拷贝 | `Dockerfile:35` | `COPY apps/backend/internal/platform/schema/schema.sql /app/schema.sql` |
| entrypoint 调用 schema-apply | `apps/backend/opentoggl-entrypoint.sh:10-12` | `opentoggl schema-apply` |
| schema-apply 命令 | `apps/backend/main.go:52-56` | `bootstrap.ApplySchemaFromEnvironment()` |
| schema apply 实现 | `apps/backend/internal/bootstrap/schema_apply.go` | 调用 pgschema reconcile |
| reconcile 命令构建 | `apps/backend/internal/platform/schema/reconcile.go` | 构建 pgschema CLI 命令 |
| reconcile 测试 | `apps/backend/internal/platform/schema/reconcile_test.go` | reconcile 单元测试 |
| schema 路径发现 | `apps/backend/internal/platform/schema/path.go` | `OPENTOGGL_SCHEMA_PATH` 或编译路径 |
| schema 路径测试 | `apps/backend/internal/platform/schema/path_test.go` | path 单元测试 |
| schema SQL 文件 | `apps/backend/internal/platform/schema/schema.sql` | 31.6KB 目标态 DDL |
| 测试 schema 应用 | `apps/backend/internal/testsupport/pgtest/pgtest.go:141-166` | 读 schema.sql 直接 Exec |
| env 变量 | `.env.local` / `.env.example` | `OPENTOGGL_SCHEMA_PATH`、`OPENTOGGL_SCHEMA_RECONCILE` |

### 当前数据库连接方式

- `pgxpool.New(ctx, DATABASE_URL)` 创建连接池，存在 `platform.DatabaseHandle` 中
- 所有仓库层通过 `pool.Query/QueryRow/Exec` 直接使用
- pgx 版本：v5.8.0

### 当前 schema.sql 的角色

- 唯一 schema 真相源（desired-state）
- 测试初始化直接 `pool.Exec(ctx, schemaSQL)` 执行整个文件
- Docker entrypoint 通过 `pgschema apply --file schema.sql` 对齐

---

## 目标状态

### 新的目录结构

```text
apps/backend/db/
  migrations/
    00001_baseline.sql      ← 从当前 schema.sql 生成
  schema/
    latest.sql              ← 当前结构快照（初始内容 = 当前 schema.sql）
```

### 新的运行时流程

```
应用启动 (serve)
  → goose.Up(db, migrationsFS)    // 内置，自动检查并执行 pending migrations
  → 启动 HTTP server
```

不再有 `schema-apply` 命令、不再有 `pgschema` 二进制、不再有 entrypoint 中的单独 schema 步骤。

---

## 执行步骤

### Phase 1：引入 goose + baseline migration

**做什么**：

1. `go get github.com/pressly/goose/v3`
2. 创建 `apps/backend/db/migrations/` 目录
3. 把当前 `schema.sql` 的内容作为 `00001_baseline.sql`（只保留 up 部分）
4. 把当前 `schema.sql` 复制为 `apps/backend/db/schema/latest.sql`
5. 用 `//go:embed db/migrations/*.sql` 嵌入 migration 文件

**不做什么**：

- 不删除现有 pgschema 相关代码（Phase 3 做）
- 不改测试路径（Phase 2 做）

**验证**：

- 空库 + goose up → schema 与当前 schema.sql 一致
- 已有库（v0.0.17 schema）+ 手动插入 baseline 记录到 goose_db_version → goose up 跳过 baseline

### Phase 2：替换运行时 migration 路径

**做什么**：

1. 新建 `apps/backend/internal/platform/migrate/` 包，封装 goose 调用：
   - `Run(ctx, pool)` — 从 pool 获取 conn，执行 goose up
   - `Status(ctx, pool)` — 返回当前版本和 pending migrations
2. 修改 `bootstrap.NewAppFromEnvironment()` 或 `serve` 命令：启动时先调用 `migrate.Run()`，再启动 HTTP server
3. 修改 `main.go`：
   - `serve` 命令内置 migration（不再需要单独 `schema-apply`）
   - 保留 `schema-apply` 命令但标记 deprecated，或直接删除
4. 修改 `opentoggl-entrypoint.sh`：删除 `schema-apply` 调用，直接 `exec opentoggl serve`
5. 修改 `Dockerfile`：
   - 删除 `go install github.com/pgplex/pgschema@v1.7.3`
   - 删除 `COPY --from=builder /out/pgschema /usr/local/bin/pgschema`
   - 删除 `COPY apps/backend/internal/platform/schema/schema.sql /app/schema.sql`
   - migration 文件已经通过 `embed.FS` 打进二进制，不需要额外 COPY

**验证**：

- Docker build → `docker run` → 空库自动初始化 → HTTP 可访问
- Docker build → `docker run` → 已有库自动跳过已执行 migration → HTTP 可访问

### Phase 3：替换测试路径

**做什么**：

1. 修改 `pgtest.applySchema()`：从"读 schema.sql 直接 Exec"改为"调用 goose up"
2. 删除 `platform/schema/path.go`（不再需要发现 schema.sql 路径）
3. 删除 `platform/schema/reconcile.go` 和 `reconcile_test.go`
4. 删除 `bootstrap/schema_apply.go`
5. 删除 `platform/schema/schema.sql`（已被 `db/schema/latest.sql` + `db/migrations/` 替代）
6. 清理 `.env.example` 和文档中的 `OPENTOGGL_SCHEMA_PATH`、`OPENTOGGL_SCHEMA_RECONCILE`

**验证**：

- `air` 启动 → 本地开发正常
- `go test ./...` → 所有测试通过
- `vp run test:e2e:website` → E2E 通过

### Phase 4：CI + latest.sql 校验

**做什么**：

1. CI 中增加校验：空库 → goose up → pg_dump → diff latest.sql
2. 如果不一致，CI 失败

**验证**：

- 故意让 latest.sql 和 migration 不一致 → CI 报错
- 修复后 → CI 通过

---

## goose 集成的关键代码骨架

```go
// apps/backend/internal/platform/migrate/migrate.go
package migrate

import (
    "context"
    "embed"
    "fmt"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/jackc/pgx/v5/stdlib"
    "github.com/pressly/goose/v3"
)

//go:embed db/migrations/*.sql
var migrationsFS embed.FS

func Run(ctx context.Context, pool *pgxpool.Pool) error {
    db := stdlib.OpenDBFromPool(pool)
    goose.SetBaseFS(migrationsFS)
    if err := goose.SetDialect("postgres"); err != nil {
        return fmt.Errorf("goose dialect: %w", err)
    }
    if err := goose.UpContext(ctx, db, "db/migrations"); err != nil {
        return fmt.Errorf("goose up: %w", err)
    }
    return nil
}
```

注意：`embed` 的路径是相对于包含 `//go:embed` 指令的 Go 文件的路径。如果 `migrate.go` 放在 `apps/backend/internal/platform/migrate/`，那 migration 文件需要在 `apps/backend/internal/platform/migrate/db/migrations/`，或者把 embed 声明放在更上层。具体文件组织在实现时确定，这里只是骨架。

---

## baseline 策略

### 新库

- goose up 从 `00001_baseline.sql` 开始，执行所有 migration

### 从 v0.0.17 升级的已有库

- 手动或通过启动逻辑在 `goose_db_version` 表中插入 baseline 记录（版本 1，标记已执行）
- goose up 跳过 baseline，执行后续 migration

具体的 baseline 桥接逻辑（如何判断已有库是否已经是 v0.0.17 schema）需要在 Phase 2 实现时设计。推荐方式：检查 `goose_db_version` 表是否存在，不存在则判断是否有现有表（如 `identity_users`），有则插入 baseline 记录。

### 早于 v0.0.17 的库

- 不承诺自动升级
- 文档中明确声明

---

## 需要注意的风险

1. **测试路径切换可能暴露隐藏问题**：当前测试通过直接 Exec schema.sql 初始化，切到 goose up 后如果某个 migration 有问题会立刻暴露。这是好事，但可能短期内增加修复工作量。

2. **embed.FS 路径组织**：Go 的 `//go:embed` 只能嵌入当前包或子目录的文件。migration 目录的物理位置需要和 embed 声明的包位置匹配。

3. **已有库的 baseline 桥接**：这是最容易出错的地方。必须在 Phase 2 中有明确的检测逻辑和测试覆盖。

4. **CLAUDE.md 需要同步更新**：当前写着"PostgreSQL schema via `pgschema` only. No second migration toolchain."。切换完成后必须更新为 goose 相关规则。

---

## 完成标志

- [ ] `go.mod` 包含 `github.com/pressly/goose/v3`
- [ ] `apps/backend/db/migrations/00001_baseline.sql` 存在
- [ ] `apps/backend/db/schema/latest.sql` 存在
- [ ] `serve` 启动时自动执行 migration
- [ ] `schema-apply` 命令和 pgschema 二进制已移除
- [ ] Dockerfile 不再安装或拷贝 pgschema
- [ ] entrypoint 不再调用 schema-apply
- [ ] 测试通过 goose up 初始化而非直接 Exec schema.sql
- [ ] CI 校验 latest.sql 与 migration 一致性
- [ ] CLAUDE.md 中 pgschema 相关规则已更新
- [ ] `platform/schema/reconcile.go`、`path.go`、`schema.sql`、`bootstrap/schema_apply.go` 已删除
