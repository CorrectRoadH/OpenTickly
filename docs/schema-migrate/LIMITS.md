**相关文档**:
- [GOALS.md](GOALS.md)
- [PLAN-1.md](PLAN-1.md) | [PLAN-2.md](PLAN-2.md) | [PLAN-3.md](PLAN-3.md) | [PLAN-4.md](PLAN-4.md)

## 目的

这里记录候选数据库 schema / migrate 方案的限制和边界。
按方案组织，不写目标，不写落地步骤，只写各自擅长什么、不擅长什么、会带来什么影响。

---

# `pgschema` desired-state apply

当前 OpenToggl 使用的方向：维护一份目标 schema SQL，然后通过 `plan/apply` 把 live database 对齐到目标状态。

## 当前支持

- 仓库里有一份当前结构的 SQL 文件，阅读门槛低
- 新库初始化很直接，空库对齐到目标状态即可
- 日常简单 DDL 变更的体验轻

## 限制

- 更偏“目标状态对齐”，不擅长表达复杂迁移过程
- 表重建、字段重命名、数据结构变更时，容易退化成危险或不可控的 diff
- 数据回填、兼容期双写、分阶段删列这类迁移不是主模型
- schema review 看到的是目标状态，不一定能看清楚“中间怎么迁”
- self-hosting 需要额外携带外部 schema CLI 和命令编排
- 测试、entrypoint、部署都会和外部 `pgschema` 工具形成耦合

## 直接影响

- 小改动时速度快，大改动时不稳定
- 复杂功能开发会被 schema 工具模型反过来限制
- Docker / 单二进制交付会多一层额外依赖和运维心智负担

---

# 自研轻量 migration runner（学 `memos`）

思路：自己在应用里维护 migration 文件、版本判断、初始化逻辑和执行器。

## 当前支持

- 可以做成单二进制内置 migrate
- 可以做 baseline 初始化
- 可以按项目需要定制命令和启动时机

## 限制

- 需要自己维护版本表、排序、事务语义、锁、错误处理
- 需要自己补测试基建、状态查询、审阅约束
- 初期看起来简单，后期会不断补齐通用框架已有能力
- 如果演进到复杂数据迁移、多副本部署，容易补成半套 `goose`

## 直接影响

- 短期实现快，但中长期会形成基础设施维护负担
- schema/migrate 机制会变成 OpenToggl 自己要长期维护的子系统

---

# `golang-migrate`

通用 migration framework，偏文件驱动和标准 version table。

## 当前支持

- 版本化 migration、状态表、命令行工具都成熟
- 社区广泛使用，基础设施可靠
- 适合 append-only migration 模式

## 限制

- 更像通用 runner，不太贴近 Go 服务里的复杂数据迁移工作流
- 对“在应用里顺手写复杂 Go migration”这件事不如 `goose` 自然
- 如果 OpenToggl 想把 migrate 深度内置到自己的 Go 代码里，集成体验一般

## 直接影响

- 能解决版本化执行问题
- 但对 OpenToggl 这种 Go 单体后端，不是最顺手的开发体验

---

# `goose`

Go 生态里常见的 migration framework，支持 SQL migration 和 Go migration。

## 当前支持

- 标准版本表和顺序执行模型
- SQL migration 简单直接
- 复杂数据迁移可以写 Go
- 很容易内置到 Go 二进制和 Docker 启动链路
- 很适合 baseline + incremental migrations 的模式

## 限制

- 默认真相源是 migration 历史，不是单份 schema SQL
- 团队需要额外维护 `latest.sql` 快照，才能满足“快速读当前结构”的目标
- 仍然不会自动替你解决大表回填、兼容期、双写切换这些上线设计问题
- 如果团队 discipline 不足，migration 和快照文件会漂移

## 直接影响

- 更适合 OpenToggl 当前“结构经常改、需要复杂迁移、要支持 self-hosting”的约束
- 代价是团队必须接受“数据库变更是显式写 migration，不是只改目标 schema”

---

# `tern`

pgx 作者（jackc）写的 migration framework，直接接受 `*pgx.Conn`。

## 当前支持

- 直接使用 pgx v5 connection，零驱动适配
- SQL migration + Go migration（`UpFunc`/`DownFunc` 回调）
- 内置 advisory lock，多副本部署开箱安全
- 支持 `fs.FS`/`embed.FS`，可以打进单二进制
- SQL migration 中支持 Go template 语法
- 很适合内置到 Go 二进制

## 限制

- 社区规模比 goose 小很多（~900 stars vs 5k+），文档、issue 解答、第三方集成示例少
- 默认真相源是 migration 历史，不是单份 schema SQL（与 goose 相同）
- 团队同样需要额外维护 `latest.sql` 快照（与 goose 相同）
- 仍然不会自动替你解决大表回填、兼容期、双写切换（与 goose 相同）
- 模板语法如果滥用会降低 SQL migration 可读性

## 直接影响

- 与 goose 解决同一组问题，核心差异是技术栈亲和度
- 对 OpenToggl 这种全栈 pgx 项目，集成摩擦最低
- 代价是社区支撑更薄，遇到边缘问题时可参考的资料更少

---

# `Atlas`

声明式 schema 管理 + diff + migration 生成工具链。

## 当前支持

- 可以维护目标 schema 并自动生成 migration 草稿
- 更强的 schema diff、lint、drift detection 能力
- 对“唯一 schema 定义”更友好

## 限制

- 复杂数据迁移最终仍要手写逻辑
- 引入成本比 `goose` 高，概念更多
- 现在 OpenToggl 的核心问题不是“缺 schema diff”，而是“缺显式可控的迁移过程”
- 如果一开始就切 Atlas，学习成本和落地复杂度会偏高

## 直接影响

- 长期可能是有价值的增强层
- 但作为当前第一步替换 `pgschema`，偏重
