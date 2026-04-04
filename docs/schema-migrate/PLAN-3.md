**需求**: [GOALS.md](GOALS.md)
**限制**: [LIMITS.md](LIMITS.md)

---

## 实现方案 3

### 简述

- 保留 `pgschema` desired-state apply 并追加手工分阶段迁移规范，解决单一 schema SQL 和短期最小改动成本需求，未解决的是复杂迁移过程仍然缺少版本化历史、内置迁移执行器和对 self-hosting 单二进制的长期简化。

---

## 核心设计

### 保留现状

- 继续使用仓库中的单份 `schema.sql`
- 继续使用 `pgschema plan/apply`
- 继续保留现有 Docker / entrypoint / 测试链路

### 新增约束

- 所有复杂变更必须在设计文档中拆成 expand / contract 阶段
- 不允许直接依赖 `pgschema` 自动推导完成表重建、字段重命名、数据回填
- 需要补充人工 SQL 脚本或一次性运维步骤来完成复杂迁移

### 各类变更如何产生 schema 与 migration

#### 1. 纯新增字段 / 表 / 索引

- 直接修改 `schema.sql`
- 使用 `pgschema plan/apply`
- 如果需要默认值或简单回填，追加人工 SQL 步骤

#### 2. 删除字段 / 表 / 索引

- 先改应用，确保不再依赖旧结构
- 再修改 `schema.sql`
- 再执行 `pgschema plan/apply`

#### 3. 字段重命名 / 同名结构变化 / 表重建

- `schema.sql` 只写最终状态
- 不依赖 `pgschema` 自动猜测 rename / rebuild
- 必须单独设计人工 SQL 步骤：
  - 加临时结构
  - 回填
  - 切代码
  - 删旧结构
- 这些步骤不会自然体现在 `schema.sql` 里，只能依赖额外设计文档和操作说明

#### 4. 数据回填

- 只能通过人工 SQL 脚本、后台 job 或临时运维步骤完成
- `schema.sql` 本身不表达回填过程

### `schema.sql` 的产生规则

- 只表达目标最终状态
- 不表达兼容期中的临时列、临时表、回填进度
- 复杂迁移时，真实过程会散落在设计文档和运维步骤中

### 适用重点

- 短期内不想切换工具链
- 优先保持现有流程和文档不大改
- 接受复杂迁移继续依赖人工控制

---

## 优势

- **部分满足单一 schema 真相源目标**：对应 [GOALS.md](GOALS.md) 里“单一 schema 真相源”，继续保留单一 `schema.sql`，当前阅读体验最好
- **部分满足新库初始化与老库升级目标**：对应 [GOALS.md](GOALS.md) 里“新库初始化与老库升级都要简单”，短期内继续沿用现有 `pgschema plan/apply` 路径，不需要立即重构初始化方式
- **短期最容易维持 self-hosting 现状**：对应 [GOALS.md](GOALS.md) 里“适配 self-hosting 交付”，因为现有 Docker / entrypoint 不需要立刻大改
- **改动最小**：虽然不是 `GOALS.md` 的单独目标，但现有代码、Docker、测试和文档耦合最少变动

---

## 缺点

- **根本问题没解决**：对应 [LIMITS.md](LIMITS.md) 里 `pgschema` 的“更偏目标状态对齐，不擅长表达复杂迁移过程”
- **长期不适合 self-hosting 简化**：对应 [LIMITS.md](LIMITS.md) 里 `pgschema` 的“self-hosting 需要额外携带外部 schema CLI 和命令编排”
- **复杂迁移要靠纪律补洞**：对应 [LIMITS.md](LIMITS.md) 里 `pgschema` 的“数据回填、兼容期双写、分阶段删列这类迁移不是主模型”
- **测试路径和生产路径仍耦合外部工具**：对应 [LIMITS.md](LIMITS.md) 里 `pgschema` 的“测试、entrypoint、部署都会和外部 `pgschema` 工具形成耦合”

---

## 已触发痛点的解决方式

### FK 目标变更 + 约束改写 + 列删除（`36ad3fc` 类场景）

- pgschema diff 会尝试自动推导，但对 FK 目标变更和 CHECK 约束值集合变更，结果不可控
- 本方案的应对：在 `schema.sql` 更新之前，先手动执行一系列人工 SQL 脚本完成迁移，再更新 `schema.sql` 让 pgschema 认为已经是目标状态
- 问题：这些人工 SQL 脚本不在版本化体系内，散落在设计文档或运维记录中，无法复现、无法 code review、无法在 CI 中自动执行

### 表重建（`9a508b2` 类场景）

- **数据不保留**：pgschema 恰好能完成（drop + create），但无法区分意图——reviewer 只看到 `schema.sql` 的最终状态变化，不知道这是故意丢弃还是遗漏了数据迁移
- **数据保留**：必须在 pgschema apply 之前手动执行迁移脚本，这些脚本同样不在版本化体系内

### 同名字段数据结构变化（`81abf94` 类场景）

- pgschema diff 尝试 `ALTER COLUMN ... TYPE bigint[]`，有数据时直接报错
- **数据不保留**：需要手动先 `DROP COLUMN` + `ADD COLUMN`，再执行 pgschema apply 让它认为已经是目标状态
- **数据保留**：需要手动执行加临时列 → 转换 → 交换的完整流程，全部在 pgschema 体系之外
- 无论哪种，pgschema 本身无法完成这个变更，必须靠人工绕过

### 共同问题

所有复杂变更在本方案下都退化成"先手动操作数据库，再更新 schema.sql 让 pgschema 追认"。这意味着：
- 生产迁移过程不可复现
- self-hosted 用户无法自动完成升级
- CI 无法验证迁移路径

---

## 适用判断

- 这是一个“延后决策”的保守方案，不是长期目标方案
- 只适合在当前阶段需要先稳住其它大改动、暂时不切 migration 体系时使用

---

## 结论

如果 OpenToggl 只是想降低当前改造风险、短期不动 schema 工具链，这个方案可作为过渡；如果目标是解决复杂迁移和 self-hosting 长期交付问题，这不是终局方案。
