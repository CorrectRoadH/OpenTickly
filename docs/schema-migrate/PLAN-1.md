**需求**: [GOALS.md](GOALS.md)
**限制**: [LIMITS.md](LIMITS.md)

---

## 实现方案 1（推荐）

### 简述

- 使用 `goose` + baseline + 内置 migrate runner，解决版本化迁移、复杂 DDL/数据迁移、self-hosting/Docker/单二进制交付和当前 schema 快照需求，未解决的是大规模回填与兼容窗口仍需团队手工设计、`latest.sql` 仍需维护或生成。

---

## 核心设计

### 真相源划分

- **生产真相源**：版本化 migration 文件
- **当前结构快照**：`latest.sql`

这两个概念明确分离：

- migration 负责描述“怎么从旧世界走到新世界”
- `latest.sql` 负责描述“今天的数据库长什么样”

### 建议目录

```text
apps/backend/db/migrations/
  00001_baseline.sql
  00002_...
  00003_...

apps/backend/db/schema/
  latest.sql
```

### 初始化与升级

- 新库：通过 baseline / latest schema 快速初始化
- 老库：应用启动时自动检查并执行未完成 migrations
- 生产库中记录 migration 历史
- 启动时通过 goose advisory lock 确保只有一个实例执行 migration

当前升级支持边界需要明确收口：

- 支持空库通过 baseline 快速初始化
- 正式支持从 `v0.0.17` 的现状 schema 迁移到新 migration 体系
- `v0.0.17` 是旧世界到 versioned migration 世界的受支持桥接起点
- 早于 `v0.0.17` 的历史版本不承诺自动升级；如果未来需要支持，必须单独补桥接 migration 和验证证据

### self-hosting 形态

- Docker 镜像内只需要 OpenToggl 后端二进制
- 不再依赖外部 `pgschema` CLI
- 正式版单二进制启动时，应用自动检查并执行 pending migrations，再进入服务就绪流程
- 用户不需要显式调用独立 migrate 命令；启动程序本身就是正式 migration 入口
- migration 正确性由开发期、本地测试、CI 和发布验证保证，而不是转嫁给最终操作者手工执行

### 复杂迁移策略

- 简单 DDL：SQL migration
- 小规模数据回填：SQL migration
- 大规模或复杂数据迁移：Go migration
- 破坏性变更默认走 expand / contract：
  - 先加新结构
  - 发布兼容代码
  - 回填数据
  - 切读路径
  - 最后删除旧结构

### 各类变更如何产生 schema 与 migration

#### 1. 纯新增字段 / 新增表 / 新增索引

- **schema 如何产生**：
  - 先修改当前目标结构定义
  - 更新 `latest.sql`，让它反映变更后的最终状态
- **migration 如何写**：
  - 新建一个 SQL migration，显式写 `ADD COLUMN`、`CREATE TABLE`、`CREATE INDEX`
- **数据回填**：
  - 如果字段可通过默认值满足，直接在 migration 中设置默认值
  - 如果需要根据旧数据计算，再追加一条单独的 backfill migration

#### 2. 删除字段 / 删除索引 / 删除表

- **schema 如何产生**：
  - 目标结构里删除对应对象
  - 更新 `latest.sql` 反映最终状态
- **migration 如何写**：
  - 不直接一步删掉并上线新代码
  - 先发一版应用，确保代码已经不再依赖旧结构
  - 再单独提交 drop migration
- **数据回填**：
  - 删除类变更本身不做回填
  - 如果旧字段数据需要保留到新结构，必须先完成迁移再删

#### 3. 字段重命名

- **schema 如何产生**：
  - `latest.sql` 只体现重命名后的最终字段名
- **migration 如何写**：
  - 不依赖 diff 工具猜测 rename
  - 默认按“新增新字段 -> 回填 -> 应用切读写 -> 删除旧字段”处理
  - 如果确认数据库原生 `RENAME COLUMN` 足够安全，也仍需显式写 migration，不允许隐式推断
- **数据回填**：
  - 通过 SQL 或 Go migration，把旧字段值写入新字段
  - 应用在兼容窗口内同时兼容旧字段和新字段，直到回填完成

#### 4. 字段同名但数据结构变化

- **典型例子**：
  - `text` 改 `jsonb`
  - `integer` 改 `bigint`
  - JSON shape 改版但字段名不变
- **schema 如何产生**：
  - `latest.sql` 只保留变更后的最终字段定义
- **migration 如何写**：
  - 默认不要直接原位改类型后赌一次成功
  - 推荐流程：
    1. 增加临时新字段，如 `foo_v2`
    2. 回填并校验
    3. 应用切到读写 `foo_v2`
    4. 删除旧字段 `foo`
    5. 如必须保留原字段名，再新增新的 `foo` 或重命名 `foo_v2 -> foo`
- **数据回填**：
  - 小规模可用 SQL `UPDATE`
  - 大规模或需要复杂转换时用 Go migration 分批回填
  - 回填完成后必须有校验逻辑，确认新旧字段内容一致或符合预期

#### 5. 整张表重建

- **典型例子**：
  - 主键模型变化
  - 列集合大幅调整
  - 分区、约束、索引策略重做
- **schema 如何产生**：
  - `latest.sql` 只保留新表结构
- **migration 如何写**：
  - 不直接对旧表做隐式 diff apply
  - 推荐流程：
    1. 建新表 `new_table`
    2. 回填历史数据
    3. 应用切换写入/读取到新表
    4. 观察稳定后删除旧表
    5. 如必须复用旧表名，再显式 rename
- **数据回填**：
  - 使用专门 migration 做批量拷贝和转换
  - 数据量大时必须分批、可重试、可观测

#### 6. JSON / 复合数据结构调整

- **schema 如何产生**：
  - `latest.sql` 反映新的 JSON 字段约束、默认值和索引策略
- **migration 如何写**：
  - DDL 和数据转换分开
  - 先保证新结构能被写入，再做历史 JSON 转换
- **数据回填**：
  - SQL 适合简单 JSONB 更新
  - Go migration 适合复杂结构改写、字段拆并、版本兼容转换

#### 7. 大规模数据回填

- **schema 如何产生**：
  - `latest.sql` 先反映目标结构
- **migration 如何写**：
  - 新结构上线和大回填拆成至少两步，不放进一条长事务 SQL migration
  - 使用 Go migration 或后台 job 做分批回填
- **数据回填**：
  - 需要明确 batch size、游标推进、失败重试、幂等性和进度日志
  - 回填过程中应用应保持向前兼容

### `latest.sql` 的产生规则

- `latest.sql` 不是手工拍脑袋写出来的第二真相源
- 每次 migration 设计完成后，必须同步得到“变更后的最终 schema 快照”
- 推荐顺序：
  1. 先设计 migration 和兼容步骤
  2. 再整理出最终结构
  3. 更新 `latest.sql`
- `latest.sql` 只描述最终结构，不记录兼容阶段中的临时状态
- 临时列、临时表如果只服务迁移过程且最终会删掉，不应长期留在 `latest.sql`

### 数据回填的基本规则

- 小数据量、简单变换：SQL migration
- 大数据量、复杂转换：Go migration
- 数据回填默认与结构变更解耦，不把所有步骤塞进一条 migration
- 所有回填都要满足：
  - 可重试
  - 尽量幂等
  - 可观测
  - 可分批
  - 有完成校验

---

## 必须先定义的治理规则

如果选择 PLAN-1，不能只引入 goose 和 migration 目录，还必须先把以下规则定死。

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
- Go migration 只能依赖稳定的 migration helper、raw SQL、以及受控的数据库访问层
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
- 已执行 migration 文件不得被修改；checksum 校验失败必须阻止继续启动

### 7. 测试与验证规则

- CI 必须至少验证：空库初始化、已有库升级、`latest.sql` 一致性
- 涉及复杂迁移时，测试必须覆盖真实迁移路径，而不是只验证最终 schema
- startup smoke 必须走正式版应用启动自动检查/自动执行 migration 的正式路径，而不是测试专用旁路
- self-hosted 单二进制路径必须有独立验证证据，不能只拿本地开发路径替代
- 已有库升级验证至少要覆盖：`v0.0.17` 现状 -> 当前版本；更早版本如果不支持，应在文档中明确声明而不是隐含假设
- 多分支并行开发时，允许使用 goose 的 out-of-order 能力补执行缺失 migration，但必须在 CI 和 review 中明确记录

### 8. 回滚与前向修复规则

- 默认采用 forward-only；down migration 不作为生产主回滚方案
- 高风险 migration 必须在设计阶段写明前向修复策略
- 如果某个变更需要兼容窗口、双写、分批回填或人工观察，必须拆阶段；即使这些阶段由启动自动触发，也必须有明确阶段边界和恢复语义
- 迁移失败后的恢复路径必须能回答：数据库停在第几步、是否可重试、是否需要人工介入

这些规则不是“后面再补的文档细节”，而是 PLAN-1 能否成立的前提条件。

---

## 已触发痛点的解决方式

以下逐一说明 [GOALS.md](GOALS.md) 中记录的已触发痛点，在本方案下会如何处理。

### FK 目标变更 + 约束改写 + 列删除（`36ad3fc` 类场景）

pgschema 的问题：diff 把 `catalog_groups.workspace_id → organization_id` 理解为 drop + recreate，把 CHECK 约束值集合变更理解为 drop + add，如果旧数据有 `owner` role 值会直接报错，整个过程不可控。

goose 下的处理：拆成多步显式 migration。

```sql
-- 00002_groups_to_org.sql

-- 1. 加新列
ALTER TABLE catalog_groups ADD COLUMN organization_id bigint;

-- 2. 回填：从 workspace 关联回 organization
UPDATE catalog_groups g
SET organization_id = w.organization_id
FROM tenant_workspaces w
WHERE g.workspace_id = w.id;

-- 3. 设 NOT NULL + FK
ALTER TABLE catalog_groups
  ALTER COLUMN organization_id SET NOT NULL,
  ADD CONSTRAINT catalog_groups_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES tenant_organizations (id) ON DELETE CASCADE;

-- 4. 删旧列和旧索引
DROP INDEX catalog_groups_workspace_id_idx;
ALTER TABLE catalog_groups DROP COLUMN workspace_id;

-- 5. 建新索引
CREATE INDEX catalog_groups_organization_id_idx ON catalog_groups (organization_id);
CREATE UNIQUE INDEX catalog_groups_organization_name_key ON catalog_groups (organization_id, lower(name));
```

CHECK 约束变更同理：

```sql
-- 先改约束（无数据冲突时可一步完成）
ALTER TABLE membership_workspace_members
  DROP CONSTRAINT membership_workspace_members_role_check,
  ADD CONSTRAINT membership_workspace_members_role_check
    CHECK (role IN ('admin', 'member', 'projectlead', 'teamlead'));

-- 如果旧数据有 'owner' 值，先回填
UPDATE membership_workspace_members SET role = 'admin' WHERE role = 'owner';
```

每一步都是显式的、可审阅的、可在 code review 中看到"中间怎么迁"。

### 表重建（`9a508b2` 类场景）

pgschema 的问题：`onboarding_progress` → `user_onboarding` 在 diff 里都是 drop + create，无法区分"故意丢弃"和"意外丢弃"。

goose 下的处理根据是否需要保留数据分两种：

**不保留数据**（如 `9a508b2` onboarding 业务重构）：

```sql
-- 00003_onboarding_rebuild.sql

DROP TABLE onboarding_progress;

CREATE TABLE user_onboarding (
    user_id bigint PRIMARY KEY REFERENCES identity_users (id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1
);
```

migration 文件里显式写了 DROP，code review 能确认"这是故意丢弃数据"。

**保留数据**（假设 onboarding 重构但需要迁移已完成状态）：

```sql
-- 00003_onboarding_rebuild.sql

-- 1. 建新表
CREATE TABLE user_onboarding (
    user_id bigint PRIMARY KEY REFERENCES identity_users (id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1
);

-- 2. 迁移旧数据
INSERT INTO user_onboarding (user_id, completed_at)
SELECT DISTINCT user_id, now()
FROM onboarding_progress
WHERE dismissed = true
ON CONFLICT DO NOTHING;

-- 3. 删旧表
DROP TABLE onboarding_progress;
```

核心区别：两种场景在 pgschema diff 里长得一模一样，但在 migration 文件中意图完全不同，code review 能区分。

### 同名字段数据结构变化（`81abf94` 类场景）

pgschema 的问题：`tag_ids jsonb` → `tag_ids bigint[]`，diff 尝试 `ALTER COLUMN ... TYPE bigint[]`，但 jsonb 不能隐式 cast 到 bigint array，有数据时直接报错。desired-state 模式下无法表达数据转换过程。

goose 下的处理分两种：

**数据不保留**（例如该字段尚无生产数据，或者业务确认可丢弃）：

```sql
-- 00004_array_columns_no_data.sql

-- 直接改类型，DROP DEFAULT 再重设
ALTER TABLE tracking_time_entries
  ALTER COLUMN tag_ids DROP DEFAULT,
  ALTER COLUMN tag_ids TYPE bigint[] USING '{}',
  ALTER COLUMN tag_ids SET DEFAULT '{}';

-- 对其他表的 jsonb → bigint[] 字段重复同样操作
ALTER TABLE tracking_favorites ...;
ALTER TABLE tracking_goals ...;
ALTER TABLE tracking_reminders ...;
```

migration 文件里 `USING '{}'` 显式表达"丢弃旧数据、置为空数组"，reviewer 能确认意图。

**数据保留**（生产环境已有数据，需要转换 `[1,2,3]` JSON → `{1,2,3}` pg array）：

```sql
-- 00004_array_columns_with_data.sql

-- 1. 加临时列
ALTER TABLE tracking_time_entries ADD COLUMN tag_ids_new bigint[] NOT NULL DEFAULT '{}';

-- 2. 回填：jsonb array → pg array
UPDATE tracking_time_entries
SET tag_ids_new = ARRAY(SELECT jsonb_array_elements_text(tag_ids)::bigint)
WHERE tag_ids != '[]'::jsonb;

-- 3. 交换
ALTER TABLE tracking_time_entries DROP COLUMN tag_ids;
ALTER TABLE tracking_time_entries RENAME COLUMN tag_ids_new TO tag_ids;
```

核心区别：两种场景在 pgschema diff 里长得一样（最终状态都是 `bigint[]`），但 migration 文件中意图和数据处理策略完全不同，code review 能区分"故意丢弃"和"安全转换"。

---

## 优势

- **满足单一 schema 真相源目标**：对应 [GOALS.md](GOALS.md) 里“单一 schema 真相源”，保留单一 `latest.sql` 作为当前结构快照，让人和 AI 能快速理解数据库结构
- **满足支持复杂迁移目标**：对应 [GOALS.md](GOALS.md) 里“支持复杂迁移”，不再依赖 runtime diff 推断，可以显式写表重建、字段改造、数据回填和兼容期迁移
- **满足 self-hosting 交付目标**：对应 [GOALS.md](GOALS.md) 里“适配 self-hosting 交付”，可以打进单一 Go 二进制，不强依赖外部 schema 工具
- **满足 Docker / 单二进制统一路径目标**：对应 [GOALS.md](GOALS.md) 里“适配 self-hosting 交付”，entrypoint 只需要运行应用自己的 migrate 命令
- **满足测试路径与生产路径一致目标**：对应 [GOALS.md](GOALS.md) 里“测试路径与生产路径一致”，测试库可以走和生产一致的 migration 机制
- **满足版本化与可审阅目标**：对应 [GOALS.md](GOALS.md) 里“版本化与可审阅”，数据库里可以回答当前执行到了哪一步，code review 也能看到具体 migration
- **满足新库初始化与老库升级目标**：对应 [GOALS.md](GOALS.md) 里“新库初始化与老库升级都要简单”，baseline + incremental migrations 同时覆盖新库和存量库
- **贴合现有后端技术栈**：虽然不是 `GOALS.md` 的单独目标，但 OpenToggl 本身是 Go 后端，`goose` 的 SQL/Go 双模式与当前工程形态匹配

---

## 缺点

- **流程比现在重**：对应 [LIMITS.md](LIMITS.md) 里 `goose` 的“默认真相源是 migration 历史，不是单份 schema SQL”，开发者和 AI 不再只改一份 `schema.sql`
- **要维护快照文件**：对应 [LIMITS.md](LIMITS.md) 里 `goose` 的“团队需要额外维护 `latest.sql` 快照”，否则当前结构快照会和 migration 漂移
- **不是自动化银弹**：对应 [LIMITS.md](LIMITS.md) 里 `goose` 的“仍然不会自动替你解决大表回填、兼容期、双写切换这些上线设计问题”
- **需要一次性切换成本**：对应 [LIMITS.md](LIMITS.md) 里 `pgschema` 的“测试、entrypoint、部署都会和外部 `pgschema` 工具形成耦合”，所以迁移到 `goose` 不是小补丁
- **仍需团队纪律**：对应 [LIMITS.md](LIMITS.md) 里 `goose` 的“如果团队 discipline 不足，migration 和快照文件会漂移”

---

## 结论

OpenToggl 的数据库 schema / migrate 机制应从“`pgschema` 目标状态 apply”切到：

- `goose` 负责版本化 migration 执行
- `latest.sql` 负责当前 schema 快照
- OpenToggl 二进制内置 migration runner
- Docker / 单二进制 self-hosting 统一走同一条 migrate 路径

这套方案不是最轻的，但最贴合 OpenToggl 当前的真实约束：schema 仍在快速变化，复杂迁移不可避免，而且必须服务于 self-hosting 交付。
