**需求**: [GOALS.md](GOALS.md)
**限制**: [LIMITS.md](LIMITS.md)

---

## 实现方案 2

### 简述

- 使用 `Atlas` + versioned migrations + 内置 migrate runner，解决单一目标 schema、schema diff/lint、版本化迁移、self-hosting/Docker/单二进制交付需求，未解决的是复杂数据迁移和兼容期仍需手写逻辑且整体引入成本高于 `goose`。

---

## 核心设计

### 真相源划分

- **目标 schema 真相源**：声明式 schema 文件或受控 SQL schema
- **生产执行真相源**：版本化 migration 文件
- **运行时快照**：可导出的 `latest.sql`

### 建议目录

```text
apps/backend/db/schema/
  desired.sql
  latest.sql

apps/backend/db/migrations/
  00001_baseline.sql
  00002_...
  00003_...
```

### 工作流

- 修改目标 schema
- 用 `Atlas` 生成 migration 草稿
- 人工审阅并提交 migration
- 运行时仍通过内置 migrate runner 执行 migration
- 正式版单二进制启动时由 OpenToggl 二进制自动检查并执行 pending migrations

### self-hosting 与升级支持边界

- 正式版启动时，应用自动检查并执行 pending migrations；用户不需要显式调用独立 migrate 命令
- migration 正确性由开发期、本地测试、CI 和发布验证保证，而不是转嫁给最终操作者手工执行
- 支持空库初始化到当前 schema
- 正式支持从 `v0.0.17` 的现状 schema 迁移到新 migration 体系
- `v0.0.17` 是旧世界到新 migration 世界的受支持桥接起点
- 早于 `v0.0.17` 的历史版本不承诺自动升级；如果未来需要支持，必须单独补桥接 migration 和验证证据

### 各类变更如何产生 schema 与 migration

#### 基本规则

- 目标结构先体现在声明式 schema 中
- `Atlas` 只负责生成 migration 草稿，不直接替代人工设计复杂迁移
- 最终提交到仓库的是人工审阅后的 migration 文件

#### 1. 纯新增字段 / 表 / 索引

- 先改目标 schema
- 用 `Atlas` 生成 migration 草稿
- 审阅无误后提交
- `latest.sql` 同步到变更后状态

#### 2. 删除字段 / 索引 / 表

- 先从目标 schema 中删除
- 由 `Atlas` 生成 drop 草稿
- 但仍需人工确认应用代码已不再依赖旧结构后再执行
- `latest.sql` 只保留最终状态

#### 3. 字段重命名 / 同名结构变化 / 表重建

- 不能直接信任自动 diff 结果
- 必须人工把变更改写成分阶段 migration：
  - 加新结构
  - 回填
  - 切流量
  - 删旧结构
- 目标 schema 和 `latest.sql` 只体现最终结构

#### 4. 数据回填

- 简单回填：可在生成后的 SQL migration 基础上手工补 SQL
- 复杂回填：单独补 Go migration 或后台 job
- `Atlas` 不负责设计回填策略，只负责辅助得到结构变更草稿

### `latest.sql` 的产生规则

- 由最终目标 schema 导出
- 不记录迁移兼容期中的临时列 / 临时表
- 只表达最终稳定结构

### 适用重点

- 想要长期维护一份更严格的声明式 schema
- 想做 drift detection、lint、自动检查
- 希望 migration 生成有工具辅助，而不是完全手写

---

## 优势

- **部分满足单一 schema 真相源目标**：对应 [GOALS.md](GOALS.md) 里“单一 schema 真相源”，声明式 schema 对“当前目标结构是什么”表达更清晰
- **部分满足版本化与可审阅目标**：对应 [GOALS.md](GOALS.md) 里“版本化与可审阅”，可以生成 versioned migration 草稿并进入 code review
- **部分满足 self-hosting 交付目标**：对应 [GOALS.md](GOALS.md) 里“适配 self-hosting 交付”，运行时仍可通过内置 migrate runner 服务 Docker 和单二进制交付
- **强化长期 schema 治理**：虽然不是 `GOALS.md` 的单独目标，但 diff、lint、drift detection 对多人协作和长期演进更强
- **快照和目标结构管理更系统**：虽然不是 `GOALS.md` 的单独目标，但更适合长期维护目标 schema 和最终快照

---

## 缺点

- **引入更重**：对应 [LIMITS.md](LIMITS.md) 里 `Atlas` 的“引入成本比 `goose` 高，概念更多”
- **复杂迁移仍要手写**：对应 [LIMITS.md](LIMITS.md) 里 `Atlas` 的“复杂数据迁移最终仍要手写逻辑”
- **切换成本更高**：对应 [LIMITS.md](LIMITS.md) 里 `Atlas` 的“当前第一步替换 `pgschema`，偏重”，因为会同时引入 schema 管理和 migration 管理两层变化
- **容易高估自动生成的价值**：对应 [LIMITS.md](LIMITS.md) 里 `Atlas` 的“当前核心问题不是缺 schema diff，而是缺显式可控的迁移过程”

---

## 已触发痛点的解决方式

### FK 目标变更 + 约束改写 + 列删除（`36ad3fc` 类场景）

- Atlas 的 diff 引擎能识别 FK 目标变更和 CHECK 约束变更，生成 migration 草稿
- 但草稿默认仍是 `ALTER COLUMN` / `DROP CONSTRAINT` + `ADD CONSTRAINT`，不会自动处理旧数据不兼容的情况
- 最终仍需人工审阅草稿，改写成分阶段 migration（加新列 → 回填 → 删旧列）
- 与 goose 的区别：Atlas 能自动生成起点草稿，goose 需要完全手写；但两者在复杂场景下最终都要人工设计

### 表重建（`9a508b2` 类场景）

- **数据不保留**：Atlas diff 会生成 `DROP TABLE` + `CREATE TABLE`，审阅确认后提交即可
- **数据保留**：Atlas 的自动草稿不可用，必须完全手写分阶段 migration
- Atlas 在这类场景下不比 goose 有优势，反而多了一步"丢弃自动草稿、手写替代"的流程

### 同名字段数据结构变化（`81abf94` 类场景）

- Atlas diff 会生成 `ALTER COLUMN ... TYPE bigint[]`，但如果列中有 jsonb 数据则执行报错
- **数据不保留**：需要手工把草稿改成 `ALTER COLUMN ... TYPE bigint[] USING '{}'`
- **数据保留**：需要完全手写（加临时列 → 转换 → 交换），Atlas 自动草稿没有用
- Atlas 的 lint 功能可以检测到 type change 并发出警告，但不能替代人工设计迁移过程

---

## 适用判断

- 如果 OpenToggl 近期最重要的问题是“复杂迁移容易炸”，`Atlas` 不是最短路径
- 如果 OpenToggl 中长期还想强化 schema 治理、drift 检查、自动生成草稿，`Atlas` 可以作为后续增强方向

---

## 结论

`Atlas` 是可行方案，但更像第二阶段升级路线，不适合作为当前替换 `pgschema` 的第一步主方案。
