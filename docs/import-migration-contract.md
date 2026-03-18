# Import Migration Contract

## 目的

将 `import` 的迁移合同单独定义，避免“尽可能保留 ID”停留在模糊表述。

## 当前结论

- import 是首版唯一允许超出 Toggl 当前兼容面的新增能力。
- 目标是支持 Toggl 导出数据导入，并尽可能保留原始 ID 与对象关系。
- import 是正式产品能力，而不是一次性迁移脚本。

## 合同范围

本合同覆盖：

- Toggl 导出数据导入
- 对象 ID 保留策略
- 引用关系恢复
- collision / remap 规则
- import 任务状态
- 失败、冲突、重试、幂等
- import 后的系统联动

## 核心原则

### 1. import 的目标是迁移闭环，不是通用 ETL

- import 首先服务于从 Toggl 到 OpenToggl 的迁移。
- 它不是“任意数据导入平台”。

### 2. 原始 ID 保留优先，但不是无条件保留

- 能保留原始 ID 的对象，应优先保留。
- 当 ID 保留与系统一致性、租户隔离或多源导入冲突时，应允许 remap。
- 但 remap 不能是静默行为，必须可追踪。

### 3. import 是有状态、有审计的产品动作

- import 必须产生任务记录。
- 必须有明确状态。
- 必须能看到冲突与失败明细。

## 对象级规则

### 必须优先保留原始 ID 的对象

默认优先级如下：

- organization
- workspace
- user
- client
- project
- task
- tag
- time_entry

理由：

- 这些对象最容易被外部脚本、历史链接、报表引用和 webhook 集成依赖。

### 允许 remap 的对象

当前默认原则：

- 当对象不存在外部稳定引用，或原始 ID 与当前租户空间冲突时，可以 remap。
- 具体允许 remap 的对象清单，待拿到真实导出样本后细化。

## Collision / Namespace 规则

### 单一来源导入

当前默认规则：

- 对于单一来源、空实例导入，应尽量原样保留原始 ID。

### 多来源或已有数据实例导入

当前默认规则：

- 如果原始 ID 与现有实例发生冲突，应触发冲突处理，而不是静默覆盖。
- 冲突处理可以采用 remap，但必须生成可追踪映射。

### Remap Manifest

当前默认规则：

- 发生 remap 时，系统必须生成 remap manifest。
- remap manifest 至少应对管理员可见。
- manifest 需要支持后续排障、脚本修正和人工核对。

## 任务状态模型

import 至少应有以下可观察状态：

- created
- validating
- running
- partially_succeeded
- failed
- succeeded
- canceled

如果内部系统需要更多状态，可以扩展；但对外至少要有稳定主状态。

## 幂等与重试

### 幂等

当前默认规则：

- import 必须支持幂等执行语义。
- 同一批次输入在同一目标租户重复提交时，不应无意创建重复对象。

### 重试

当前默认规则：

- 验证失败与执行失败要区分。
- 部分失败时必须能识别已成功部分和待修复部分。
- 重试不能隐式破坏已成功对象。

## 系统联动规则

这部分必须明确，否则导入后系统行为会漂移。

### Reports

当前默认规则：

- import 完成后应触发 reports / analytics 重建或补投影。
- 在重建完成前，系统应允许管理员观察导入完成但报表尚未完全同步的状态。

### Webhooks

当前默认规则：

- import 默认不应把历史数据回放成对外 webhook 事件。
- 如后续需要支持回放，必须作为显式选项，而不是默认行为。

### Billing / Quota

当前默认规则：

- import 不应默认触发历史账单回放。
- import 后是否影响当前 seat / quota / subscription 计算，必须按当前实例的真实业务规则重新评估，而不是机械复制历史收费状态。

### Audit Logs

当前默认规则：

- import 应写入审计日志。
- 审计日志应明确区分“导入动作”与“原始历史业务动作”。

## 样本前的待确认策略

- 在未收到脱敏样本前，不锁定文件格式与字段映射细节。
- 但可以先锁定：
  - 状态机
  - collision 原则
  - remap manifest 原则
  - 联动默认规则

## 待确认项

- 真实导出文件格式
- 逐字段映射规则
- 哪些次级对象必须保留原始 ID
- import 任务 API 与 UI 的精确字段
- 部分失败的最小可恢复粒度

## 与 PRD 的关系

该文档用于支撑 `docs/prd.md` 中 Import 章节。
